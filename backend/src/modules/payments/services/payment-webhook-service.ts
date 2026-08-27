import { createHmac, timingSafeEqual } from "node:crypto";
import { Prisma, PrismaClient } from "../../../generated/prisma/client";
import {
    EmailJobType,
    OrderStatus,
    PaymentLinkStatus,
    PaymentStatus
} from "../../../generated/prisma/enums";
import { createEmailJob, orderEmailPayload } from "../../emails/email-job";
import { AppError } from "../../../core/errors/app-error";
import { createUuid } from "../../../core/utils/uuid";

export type AbacateWebhookPayload = {
    id: string;
    event: string;
    apiVersion?: number;
    devMode?: boolean;
    data?: {
        checkout?: {
            id?: string;
            externalId?: string;
            amount?: number;
            paidAmount?: number;
        };
        payerInformation?: { method?: string };
        reason?: string;
        refundPublicId?: string;
    };
};

export const ABACATEPAY_WEBHOOK_PUBLIC_KEY =
    "t9dXRhHHo3yDEj5pVDYz0frf7q6bMKyMRmxxCPIPp3RCplBfXRxqlC6ZpiWmOqj4L63qEaeUOtrCI8P0VMUgo6iIga2ri9ogaHFs0WIIywSMg0q7RmBfybe1E5XJcfC4IW3alNqym0tXoAKkzvfEjZxV6bE0oG2zJrNNYmUCKZyV0KZ3JS8Votf9EAWWYdiDkMkpbMdPggfh1EqHlVkMiTady6jOR3hyzGEHrIz2Ret0xHKMbiqkr9HS1JhNHDX9";
const PROCESSING_MARKER = "__PROCESSING__";

export type LatePaymentAlert = {
    orderUuid: string;
    providerCheckoutId: string;
    paidAmountInCents: number;
};

export function verifyAbacateWebhook(rawBody: Buffer, signature: string) {
    const expected = createHmac("sha256", ABACATEPAY_WEBHOOK_PUBLIC_KEY)
        .update(rawBody)
        .digest("base64");
    const expectedBuffer = Buffer.from(expected);
    const receivedBuffer = Buffer.from(signature);
    return (
        expectedBuffer.length === receivedBuffer.length &&
        timingSafeEqual(expectedBuffer, receivedBuffer)
    );
}

export class PaymentWebhookService {
    public constructor(
        private readonly prisma: PrismaClient,
        private readonly alertLatePayment?: (alert: LatePaymentAlert) => void | Promise<void>
    ) {}

    public async process(payload: AbacateWebhookPayload) {
        if (!payload.id || !payload.event) throw AppError.validation("Webhook sem id ou evento");

        const stored = await this.prisma.paymentWebhookEvent.upsert({
            where: { eventId: payload.id },
            create: {
                eventId: payload.id,
                eventType: payload.event,
                payload: payload as unknown as Prisma.InputJsonValue
            },
            update: {}
        });
        if (stored.processedAt) return { duplicate: true };
        const staleProcessingBefore = new Date(Date.now() - 300_000);
        const claimed = await this.prisma.paymentWebhookEvent.updateMany({
            where: {
                eventId: payload.id,
                processedAt: null,
                OR: [
                    { error: null },
                    { error: { not: PROCESSING_MARKER } },
                    { error: PROCESSING_MARKER, updatedAt: { lt: staleProcessingBefore } }
                ]
            },
            data: { error: PROCESSING_MARKER }
        });
        if (claimed.count === 0) {
            const current = await this.prisma.paymentWebhookEvent.findUnique({
                where: { eventId: payload.id },
                select: { processedAt: true }
            });
            if (current?.processedAt) return { duplicate: true };
            throw AppError.conflict("Webhook ja esta sendo processado");
        }

        try {
            if (!payload.event.startsWith("checkout.")) {
                await this.markProcessed(payload.id);
                return { ignored: true };
            }

            const checkout = payload.data?.checkout;
            if (!checkout?.id || !checkout.externalId) {
                throw AppError.validation("Webhook sem dados do checkout");
            }
            const payment = await this.prisma.orderPayment.findUnique({
                where: { providerCheckoutId: checkout.id },
                include: {
                    order: {
                        include: {
                            user: true,
                            items: true
                        }
                    }
                }
            });
            if (!payment) {
                const paymentLink = await this.prisma.paymentLink.findUnique({
                    where: { providerCheckoutId: checkout.id }
                });
                if (!paymentLink || checkout.externalId !== `payment-link:${paymentLink.uuid}`) {
                    throw AppError.notFound("Pagamento do webhook nao encontrado");
                }
                return await this.processPaymentLink(payload, checkout, paymentLink);
            }
            if (payment.order.uuid !== checkout.externalId) {
                throw AppError.notFound("Pagamento do webhook nao encontrado");
            }

            if (payload.event === "checkout.completed") {
                if (
                    checkout.amount !== payment.expectedAmountInCents ||
                    checkout.paidAmount !== payment.expectedAmountInCents
                ) {
                    throw AppError.conflict("Valor pago diverge do total esperado");
                }
                const result = await this.prisma.$transaction(async (tx) => {
                    const orderTransition = await tx.order.updateMany({
                        where: { id: payment.orderId, status: OrderStatus.AWAITING_PAYMENT },
                        data: { status: OrderStatus.PAID }
                    });

                    if (orderTransition.count === 0) {
                        const order = await tx.order.findUniqueOrThrow({
                            where: { id: payment.orderId },
                            select: { status: true }
                        });
                        let latePaymentRecorded = false;
                        if (order.status === OrderStatus.CANCELLED) {
                            const latePayment = await tx.orderPayment.updateMany({
                                where: {
                                    id: payment.id,
                                    status: {
                                        in: [
                                            PaymentStatus.CREATING,
                                            PaymentStatus.PENDING,
                                            PaymentStatus.PAID
                                        ]
                                    }
                                },
                                data: {
                                    status: PaymentStatus.REFUND_PENDING,
                                    paidAmountInCents: checkout.paidAmount,
                                    providerMethod: payload.data?.payerInformation?.method,
                                    paidAt: payment.paidAt ?? new Date(),
                                    refundReason:
                                        "Pagamento confirmado depois do cancelamento; acao manual necessaria"
                                }
                            });
                            latePaymentRecorded = latePayment.count === 1;
                        }
                        await tx.paymentWebhookEvent.update({
                            where: { eventId: payload.id },
                            data: { processedAt: new Date(), error: null }
                        });
                        return { latePaymentRecorded };
                    }

                    const paymentTransition = await tx.orderPayment.updateMany({
                        where: {
                            id: payment.id,
                            status: { in: [PaymentStatus.CREATING, PaymentStatus.PENDING] }
                        },
                        data: {
                            status: PaymentStatus.PAID,
                            paidAmountInCents: checkout.paidAmount,
                            providerMethod: payload.data?.payerInformation?.method,
                            paidAt: payment.paidAt ?? new Date()
                        }
                    });
                    if (paymentTransition.count !== 1) {
                        throw AppError.conflict("Pagamento nao estava disponivel para confirmacao");
                    }
                    await tx.fulfillmentJob.upsert({
                        where: { orderId: payment.orderId },
                        create: { uuid: createUuid(), orderId: payment.orderId },
                        update: {}
                    });
                    await tx.emailJob.upsert({
                        where: {
                            deduplicationKey: `payment-paid:${payment.order.uuid}`
                        },
                        create: createEmailJob({
                            type: EmailJobType.PAYMENT_CONFIRMED,
                            recipient: payment.order.user.email,
                            deduplicationKey: `payment-paid:${payment.order.uuid}`,
                            payload: orderEmailPayload({
                                customerName: payment.order.user.name,
                                orderUuid: payment.order.uuid,
                                items: payment.order.items.map((item) => ({
                                    name: item.productNameSnapshot,
                                    quantity: item.quantity,
                                    totalInCents: item.totalPriceInCents
                                })),
                                subtotalInCents: payment.order.subtotalInCents,
                                shippingInCents: payment.order.shippingInCents,
                                discountInCents: payment.order.discountInCents,
                                totalInCents: payment.order.totalInCents
                            })
                        }),
                        update: {}
                    });
                    await tx.paymentWebhookEvent.update({
                        where: { eventId: payload.id },
                        data: { processedAt: new Date(), error: null }
                    });
                    return { latePaymentRecorded: false };
                });
                if (result.latePaymentRecorded && this.alertLatePayment) {
                    try {
                        await this.alertLatePayment({
                            orderUuid: payment.order.uuid,
                            providerCheckoutId: checkout.id,
                            paidAmountInCents: checkout.paidAmount
                        });
                    } catch {
                        // Registro financeiro duravel nao pode ser revertido por falha do alerta.
                    }
                }
                if (result.latePaymentRecorded) {
                    return {
                        processed: true,
                        orderUuid: payment.order.uuid,
                        refundPending: true
                    };
                }
                return { processed: true, orderUuid: payment.order.uuid };
            }

            const state = this.eventState(payload.event);
            if (state) {
                await this.prisma.$transaction([
                    this.prisma.orderPayment.update({
                        where: { id: payment.id },
                        data: {
                            status: state.status,
                            refundPublicId: payload.data?.refundPublicId,
                            refundReason: payload.data?.reason,
                            refundedAt:
                                state.status === PaymentStatus.REFUNDED ? new Date() : undefined,
                            disputedAt:
                                state.status === PaymentStatus.DISPUTED ? new Date() : undefined,
                            lostAt: state.status === PaymentStatus.LOST ? new Date() : undefined
                        }
                    }),
                    this.prisma.paymentWebhookEvent.update({
                        where: { eventId: payload.id },
                        data: { processedAt: new Date(), error: null }
                    })
                ]);
            } else {
                await this.markProcessed(payload.id);
            }
            return { processed: true };
        } catch (error) {
            await this.prisma.paymentWebhookEvent.update({
                where: { eventId: payload.id },
                data: {
                    error:
                        error instanceof Error ? error.message.slice(0, 500) : "Falha desconhecida"
                }
            });
            throw error;
        }
    }

    private eventState(event: string) {
        if (event === "checkout.refunded") return { status: PaymentStatus.REFUNDED };
        if (event === "checkout.disputed") return { status: PaymentStatus.DISPUTED };
        if (event === "checkout.lost") return { status: PaymentStatus.LOST };
        return null;
    }

    private async processPaymentLink(
        payload: AbacateWebhookPayload,
        checkout: { id?: string; externalId?: string; amount?: number; paidAmount?: number },
        paymentLink: {
            id: number;
            uuid: string;
            amountInCents: number;
            paidAt: Date | null;
        }
    ) {
        if (payload.event === "checkout.completed") {
            if (
                checkout.amount !== paymentLink.amountInCents ||
                checkout.paidAmount !== paymentLink.amountInCents
            ) {
                throw AppError.conflict("Valor pago diverge do total esperado");
            }
            await this.prisma.$transaction([
                this.prisma.paymentLink.update({
                    where: { id: paymentLink.id },
                    data: {
                        status: PaymentLinkStatus.PAID,
                        paidAmountInCents: checkout.paidAmount,
                        providerMethod: payload.data?.payerInformation?.method,
                        paidAt: paymentLink.paidAt ?? new Date()
                    }
                }),
                this.prisma.paymentWebhookEvent.update({
                    where: { eventId: payload.id },
                    data: { processedAt: new Date(), error: null }
                })
            ]);
            return { processed: true, paymentLinkUuid: paymentLink.uuid };
        }

        const status = this.paymentLinkEventState(payload.event);
        if (status) {
            await this.prisma.$transaction([
                this.prisma.paymentLink.update({
                    where: { id: paymentLink.id },
                    data: {
                        status,
                        refundPublicId: payload.data?.refundPublicId,
                        refundReason: payload.data?.reason,
                        refundedAt: status === PaymentLinkStatus.REFUNDED ? new Date() : undefined,
                        disputedAt: status === PaymentLinkStatus.DISPUTED ? new Date() : undefined,
                        lostAt: status === PaymentLinkStatus.LOST ? new Date() : undefined
                    }
                }),
                this.prisma.paymentWebhookEvent.update({
                    where: { eventId: payload.id },
                    data: { processedAt: new Date(), error: null }
                })
            ]);
        } else {
            await this.markProcessed(payload.id);
        }
        return { processed: true, paymentLinkUuid: paymentLink.uuid };
    }

    private paymentLinkEventState(event: string) {
        if (event === "checkout.refunded") return PaymentLinkStatus.REFUNDED;
        if (event === "checkout.disputed") return PaymentLinkStatus.DISPUTED;
        if (event === "checkout.lost") return PaymentLinkStatus.LOST;
        return null;
    }

    private markProcessed(eventId: string) {
        return this.prisma.paymentWebhookEvent.update({
            where: { eventId },
            data: { processedAt: new Date(), error: null }
        });
    }
}
