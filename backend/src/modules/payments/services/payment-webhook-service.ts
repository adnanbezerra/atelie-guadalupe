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

export function verifyAbacateWebhook(rawBody: Buffer, signature: string, key: string) {
    const expected = createHmac("sha256", key).update(rawBody).digest("base64");
    const expectedBuffer = Buffer.from(expected);
    const receivedBuffer = Buffer.from(signature);
    return (
        expectedBuffer.length === receivedBuffer.length &&
        timingSafeEqual(expectedBuffer, receivedBuffer)
    );
}

export class PaymentWebhookService {
    public constructor(private readonly prisma: PrismaClient) {}

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
                await this.prisma.$transaction(async (tx) => {
                    await tx.orderPayment.update({
                        where: { id: payment.id },
                        data: {
                            status: PaymentStatus.PAID,
                            paidAmountInCents: checkout.paidAmount,
                            providerMethod: payload.data?.payerInformation?.method,
                            paidAt: payment.paidAt ?? new Date()
                        }
                    });
                    await tx.order.updateMany({
                        where: { id: payment.orderId, status: OrderStatus.AWAITING_PAYMENT },
                        data: { status: OrderStatus.PAID }
                    });
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
                });
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
