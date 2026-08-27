import { Prisma, PrismaClient } from "../../../generated/prisma/client";
import { OrderStatus, PaymentStatus, ShippingStatus } from "../../../generated/prisma/enums";
import { Either, left, right } from "../../../core/either/either";
import { AppError } from "../../../core/errors/app-error";
import { createUuid } from "../../../core/utils/uuid";
import { AbacateCheckout, AbacatePayClient } from "./abacatepay-client";
import { checkoutUnavailableError, isCheckoutCreationEnabled } from "./checkout-availability";

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
            if (order.payment.status === PaymentStatus.CREATING) {
                return left(
                    AppError.business(
                        "Checkout divergente registrado e requer reconciliacao manual"
                    )
                );
            }
            if (order.status === OrderStatus.CANCELLED) {
                return left(
                    AppError.business(
                        "Pedido cancelado possui checkout registrado e requer reconciliacao"
                    )
                );
            }
            return right(paymentResponse(order.payment));
        }
        let payment = order.payment;
        if (payment) {
            const reconciled = await this.reconcileCreatingPayment(order.uuid, payment);
            if (reconciled?.orderTransitioned) return right(paymentResponse(reconciled.payment));
            if (reconciled) {
                return left(
                    AppError.business(
                        "Pedido foi cancelado; checkout registrado para reconciliacao"
                    )
                );
            }
            return left(
                AppError.conflict(
                    "A criacao do pagamento ainda esta em andamento; repita com a mesma chave"
                )
            );
        }
        if (!isCheckoutCreationEnabled()) {
            return left(checkoutUnavailableError());
        }
        if (order.status !== OrderStatus.PENDING && order.status !== OrderStatus.AWAITING_PAYMENT) {
            return left(AppError.business("Pedido nao esta disponivel para iniciar pagamento"));
        }
        if (!order.addressId || order.shipment?.status !== ShippingStatus.CONFIRMED) {
            return left(AppError.business("Confirme o endereco e o frete antes do pagamento"));
        }
        if (order.totalInCents <= 0) {
            return left(AppError.business("O total do pedido precisa ser positivo"));
        }

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
            if (reconciled?.orderTransitioned) return right(paymentResponse(reconciled.payment));
            if (reconciled) {
                return left(
                    AppError.business(
                        "Pedido foi cancelado; checkout registrado para reconciliacao"
                    )
                );
            }
            return left(
                AppError.conflict(
                    "A criacao do pagamento ainda esta em andamento; repita com a mesma chave"
                )
            );
        }

        let items: Array<{ id: string; quantity: number }>;
        try {
            items = await this.buildCheckoutItems(order);
        } catch (error) {
            await this.prisma.orderPayment.deleteMany({
                where: {
                    id: payment.id,
                    status: PaymentStatus.CREATING,
                    providerCheckoutId: null
                }
            });
            throw error;
        }
        const checkout = await this.abacatePay.createCheckout({
            externalId: order.uuid,
            items,
            methods: ["PIX", "CARD"],
            returnUrl: process.env.ABACATEPAY_RETURN_URL,
            completionUrl: process.env.ABACATEPAY_COMPLETION_URL,
            metadata: { orderUuid: order.uuid, idempotencyKey }
        });
        const checkoutMismatch = this.checkoutMismatch(
            checkout,
            order.uuid,
            order.totalInCents
        );
        if (checkoutMismatch) {
            await this.recordDivergentCheckout(order.id, checkout);
            return left(checkoutMismatch);
        }

        const updated = await this.saveReconciledCheckout(order.id, checkout);
        if (!updated.orderTransitioned) {
            return left(
                AppError.business("Pedido foi cancelado; checkout registrado para reconciliacao")
            );
        }
        return right(paymentResponse(updated.payment));
    }

    private async reconcileCreatingPayment(
        orderUuid: string,
        payment: { orderId: number; status: PaymentStatus; expectedAmountInCents: number }
    ) {
        if (payment.status !== PaymentStatus.CREATING) return null;
        const checkout = await this.abacatePay.findCheckoutByExternalId(orderUuid);
        if (!checkout) return null;
        const mismatch = this.checkoutMismatch(
            checkout,
            orderUuid,
            payment.expectedAmountInCents
        );
        if (mismatch) {
            await this.recordDivergentCheckout(payment.orderId, checkout);
            throw mismatch;
        }
        return this.saveReconciledCheckout(payment.orderId, checkout);
    }

    private async recordDivergentCheckout(orderId: number, checkout: AbacateCheckout) {
        await this.prisma.orderPayment.update({
            where: { orderId },
            data: {
                status: PaymentStatus.CREATING,
                providerCheckoutId: checkout.id,
                checkoutUrl: null,
                providerResponse: checkout as unknown as Prisma.InputJsonValue
            }
        });
    }

    private checkoutMismatch(
        checkout: AbacateCheckout,
        orderUuid: string,
        expectedAmountInCents: number
    ) {
        if (checkout.externalId !== orderUuid) {
            return AppError.business("O checkout retornado pela AbacatePay diverge do pedido");
        }
        if (checkout.amount !== expectedAmountInCents) {
            return AppError.business("O total retornado pela AbacatePay diverge do pedido");
        }
        return null;
    }

    private async saveReconciledCheckout(orderId: number, checkout: AbacateCheckout) {
        return this.prisma.$transaction(async (tx) => {
            const orderTransition = await tx.order.updateMany({
                where: {
                    id: orderId,
                    status: { in: [OrderStatus.PENDING, OrderStatus.AWAITING_PAYMENT] }
                },
                data: {
                    status: OrderStatus.AWAITING_PAYMENT,
                    checkoutProvider: "ABACATEPAY",
                    checkoutReference: checkout.id
                }
            });
            const payment = await tx.orderPayment.update({
                where: { orderId },
                data: {
                    status: PaymentStatus.PENDING,
                    providerCheckoutId: checkout.id,
                    checkoutUrl: checkout.url,
                    providerResponse: checkout as unknown as Prisma.InputJsonValue
                }
            });
            return { payment, orderTransitioned: orderTransition.count === 1 };
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
