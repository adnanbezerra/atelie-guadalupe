import { Prisma, PrismaClient } from "../../../generated/prisma/client";
import { OrderStatus, PaymentStatus, ShippingStatus } from "../../../generated/prisma/enums";
import { Either, left, right } from "../../../core/either/either";
import { AppError } from "../../../core/errors/app-error";
import { createUuid } from "../../../core/utils/uuid";
import { AbacateCheckout, AbacatePayClient } from "./abacatepay-client";

function paymentResponse(payment: {
    status: PaymentStatus;
    providerCheckoutId: string | null;
    checkoutUrl: string | null;
    expectedAmountInCents: number;
}) {
    return {
        paymentStatus: payment.status,
        checkoutId: payment.providerCheckoutId,
        checkoutUrl: payment.checkoutUrl,
        amountInCents: payment.expectedAmountInCents
    };
}

export class PaymentService {
    public constructor(
        private readonly prisma: PrismaClient,
        private readonly abacatePay: AbacatePayClient
    ) {}

    public async createCheckout(
        currentUserUuid: string,
        orderUuid: string,
        idempotencyKey: string
    ): Promise<Either<AppError, ReturnType<typeof paymentResponse>>> {
        const order = await this.prisma.order.findUnique({
            where: { uuid: orderUuid },
            include: { user: true, shipment: true, payment: true, items: true }
        });
        if (!order || order.user.uuid !== currentUserUuid) {
            return left(AppError.notFound("Pedido nao encontrado"));
        }
        if (order.paymentIdempotencyKey !== idempotencyKey) {
            return left(AppError.conflict("Idempotency-Key nao pertence a este pedido"));
        }
        if (order.payment?.providerCheckoutId) {
            return right(paymentResponse(order.payment));
        }
        if (order.status !== OrderStatus.PENDING) {
            return left(AppError.business("Pedido nao esta disponivel para iniciar pagamento"));
        }
        if (!order.addressId || order.shipment?.status !== ShippingStatus.CONFIRMED) {
            return left(AppError.business("Confirme o endereco e o frete antes do pagamento"));
        }
        if (order.totalInCents <= 0) {
            return left(AppError.business("O total do pedido precisa ser positivo"));
        }

        let payment = order.payment;
        let createdHere = false;
        if (!payment) {
            try {
                payment = await this.prisma.orderPayment.create({
                    data: {
                        uuid: createUuid(),
                        orderId: order.id,
                        idempotencyKey,
                        expectedAmountInCents: order.totalInCents
                    }
                });
                createdHere = true;
            } catch (error) {
                const code =
                    error && typeof error === "object" && "code" in error ? error.code : null;
                if (code !== "P2002") throw error;
                payment = await this.prisma.orderPayment.findUnique({
                    where: { orderId: order.id }
                });
                if (!payment) throw error;
            }
        }

        if (!createdHere) {
            const reconciled = await this.reconcileCreatingPayment(order.uuid, payment);
            if (reconciled) return right(paymentResponse(reconciled));
            return left(
                AppError.conflict(
                    "A criacao do pagamento ainda esta em andamento; repita com a mesma chave"
                )
            );
        }

        const items = await this.buildCheckoutItems(order);
        const checkout = await this.abacatePay.createCheckout({
            externalId: order.uuid,
            items,
            methods: ["PIX", "CARD"],
            returnUrl: process.env.ABACATEPAY_RETURN_URL,
            completionUrl: process.env.ABACATEPAY_COMPLETION_URL,
            metadata: { orderUuid: order.uuid, idempotencyKey }
        });
        if (checkout.amount !== order.totalInCents) {
            return left(AppError.business("O total retornado pela AbacatePay diverge do pedido"));
        }

        const updated = await this.prisma.$transaction(async (tx) => {
            const saved = await tx.orderPayment.update({
                where: { orderId: order.id },
                data: {
                    status: PaymentStatus.PENDING,
                    providerCheckoutId: checkout.id,
                    checkoutUrl: checkout.url,
                    providerResponse: checkout as unknown as Prisma.InputJsonValue
                }
            });
            await tx.order.update({
                where: { id: order.id },
                data: {
                    status: OrderStatus.AWAITING_PAYMENT,
                    checkoutProvider: "ABACATEPAY",
                    checkoutReference: checkout.id
                }
            });
            return saved;
        });
        return right(paymentResponse(updated));
    }

    private async reconcileCreatingPayment(
        orderUuid: string,
        payment: { orderId: number; status: PaymentStatus }
    ) {
        if (payment.status !== PaymentStatus.CREATING) return null;
        const checkout = await this.abacatePay.findCheckoutByExternalId(orderUuid);
        if (!checkout) return null;
        return this.saveReconciledCheckout(payment.orderId, checkout);
    }

    private async saveReconciledCheckout(orderId: number, checkout: AbacateCheckout) {
        return this.prisma.$transaction(async (tx) => {
            const payment = await tx.orderPayment.update({
                where: { orderId },
                data: {
                    status: PaymentStatus.PENDING,
                    providerCheckoutId: checkout.id,
                    checkoutUrl: checkout.url,
                    providerResponse: checkout as unknown as Prisma.InputJsonValue
                }
            });
            await tx.order.update({
                where: { id: orderId },
                data: {
                    status: OrderStatus.AWAITING_PAYMENT,
                    checkoutProvider: "ABACATEPAY",
                    checkoutReference: checkout.id
                }
            });
            return payment;
        });
    }

    private async buildCheckoutItems(order: {
        uuid: string;
        shippingInCents: number;
        couponDiscountInCents: number;
        totalInCents: number;
        items: Array<{
            uuid: string;
            productNameSnapshot: string;
            productSize: string;
            totalPriceInCents: number;
        }>;
    }) {
        let remainingDiscount = order.couponDiscountInCents;
        const priced = order.items.map((item) => {
            const discount = Math.min(remainingDiscount, Math.max(0, item.totalPriceInCents - 1));
            remainingDiscount -= discount;
            return {
                externalId: `order-item:${item.uuid}`,
                name: `${item.productNameSnapshot} (${item.productSize})`,
                price: item.totalPriceInCents - discount
            };
        });
        if (remainingDiscount !== 0)
            throw AppError.business("Nao foi possivel distribuir o desconto do pedido");
        if (order.shippingInCents > 0) {
            priced.push({
                externalId: `shipping:${order.uuid}`,
                name: "Frete",
                price: order.shippingInCents
            });
        }
        if (priced.reduce((sum, item) => sum + item.price, 0) !== order.totalInCents) {
            throw AppError.business("A soma dos itens de pagamento diverge do total do pedido");
        }

        const result: Array<{ id: string; quantity: number }> = [];
        for (const item of priced) {
            let catalog = await this.prisma.paymentCatalogProduct.findUnique({
                where: { externalId: item.externalId }
            });
            if (!catalog) {
                const provider = await this.abacatePay.createProduct({
                    externalId: item.externalId,
                    name: item.name,
                    price: item.price
                });
                catalog = await this.prisma.paymentCatalogProduct.upsert({
                    where: { externalId: item.externalId },
                    create: {
                        externalId: item.externalId,
                        providerProductId: provider.id,
                        name: item.name,
                        priceInCents: item.price,
                        providerResponse: provider as unknown as Prisma.InputJsonValue
                    },
                    update: {}
                });
            }
            result.push({ id: catalog.providerProductId, quantity: 1 });
        }
        return result;
    }
}
