import { PrismaClient } from "../../generated/prisma/client";
import { EmailJobType, OrderStatus, ShippingStatus } from "../../generated/prisma/enums";
import { createEmailJob, orderEmailPayload } from "../emails/email-job";
import { SuperFreteClient } from "./services/superfrete-client";
import { extractSuperFreteOrderInfo } from "./services/shipping-service";

const ACTIVE_ORDER_STATUSES: OrderStatus[] = [OrderStatus.PROCESSING, OrderStatus.SHIPPED];

export class ShippingTrackingService {
    public constructor(
        private readonly prisma: PrismaClient,
        private readonly superFrete: SuperFreteClient = SuperFreteClient.fromEnv()
    ) {}

    public async processDue(limit = 20) {
        const staleBefore = new Date(
            Date.now() - Number(process.env.SHIPPING_TRACKING_LOCK_TIMEOUT_MS ?? 300000)
        );
        await this.prisma.orderShipment.updateMany({
            where: {
                status: ShippingStatus.LABEL_PURCHASED,
                trackingLockedAt: { lt: staleBefore }
            },
            data: {
                trackingLockedAt: null,
                trackingNextCheckAt: new Date(),
                trackingLastError: "Consulta de rastreamento interrompida"
            }
        });

        const shipments = await this.prisma.orderShipment.findMany({
            where: {
                status: ShippingStatus.LABEL_PURCHASED,
                superfreteOrderId: { not: null },
                trackingLockedAt: null,
                OR: [{ trackingNextCheckAt: null }, { trackingNextCheckAt: { lte: new Date() } }],
                order: {
                    status: { in: ACTIVE_ORDER_STATUSES }
                }
            },
            orderBy: { trackingNextCheckAt: "asc" },
            take: limit
        });

        for (const shipment of shipments) {
            await this.processShipment(shipment.id);
        }
    }

    private async processShipment(shipmentId: number) {
        const claimed = await this.prisma.orderShipment.updateMany({
            where: {
                id: shipmentId,
                status: ShippingStatus.LABEL_PURCHASED,
                trackingLockedAt: null
            },
            data: {
                trackingLockedAt: new Date()
            }
        });
        if (claimed.count === 0) return;

        const shipment = await this.prisma.orderShipment.findUniqueOrThrow({
            where: { id: shipmentId },
            include: {
                order: {
                    include: {
                        user: true,
                        items: true
                    }
                }
            }
        });

        try {
            const raw = await this.superFrete.getOrderInfo(shipment.superfreteOrderId!);
            const info = extractSuperFreteOrderInfo(raw, shipment.superfreteOrderId!);
            const status = info.status?.toLowerCase() ?? null;
            const now = new Date();
            const pollInterval = Number(process.env.SHIPPING_TRACKING_POLL_INTERVAL_MS ?? 600000);
            const baseShipmentUpdate = {
                superfreteStatus: status,
                trackingCode: info.trackingCode ?? shipment.trackingCode,
                trackingLastCheckedAt: now,
                trackingAttempts: 0,
                trackingLastError: null,
                trackingLockedAt: null
            };

            if (status === "delivered") {
                await this.prisma.$transaction(async (tx) => {
                    await tx.orderShipment.update({
                        where: { id: shipment.id },
                        data: {
                            ...baseShipmentUpdate,
                            postedAt: info.postedAt ?? shipment.postedAt,
                            deliveredAt: shipment.deliveredAt ?? now,
                            trackingNextCheckAt: null
                        }
                    });
                    if (ACTIVE_ORDER_STATUSES.includes(shipment.order.status)) {
                        await tx.order.update({
                            where: { id: shipment.orderId },
                            data: { status: OrderStatus.DELIVERED }
                        });
                        await tx.emailJob.upsert({
                            where: {
                                deduplicationKey: `shipment-delivered:${shipment.order.uuid}`
                            },
                            create: this.emailJob(
                                EmailJobType.ORDER_DELIVERED,
                                "shipment-delivered",
                                shipment
                            ),
                            update: {}
                        });
                    }
                });
                return;
            }

            if (status === "posted") {
                await this.prisma.$transaction(async (tx) => {
                    await tx.orderShipment.update({
                        where: { id: shipment.id },
                        data: {
                            ...baseShipmentUpdate,
                            postedAt: info.postedAt ?? shipment.postedAt ?? now,
                            trackingNextCheckAt: new Date(now.getTime() + pollInterval)
                        }
                    });
                    if (ACTIVE_ORDER_STATUSES.includes(shipment.order.status)) {
                        if (shipment.order.status === OrderStatus.PROCESSING) {
                            await tx.order.update({
                                where: { id: shipment.orderId },
                                data: { status: OrderStatus.SHIPPED }
                            });
                        }
                        await tx.emailJob.upsert({
                            where: {
                                deduplicationKey: `shipment-posted:${shipment.order.uuid}`
                            },
                            create: this.emailJob(
                                EmailJobType.ORDER_SHIPPED,
                                "shipment-posted",
                                shipment,
                                info.trackingCode ?? shipment.trackingCode ?? undefined
                            ),
                            update: {}
                        });
                    }
                });
                return;
            }

            if (status === "cancelled" || status === "canceled") {
                await this.prisma.orderShipment.update({
                    where: { id: shipment.id },
                    data: {
                        ...baseShipmentUpdate,
                        status: ShippingStatus.CANCELLED,
                        cancelledAt: shipment.cancelledAt ?? now,
                        trackingNextCheckAt: null
                    }
                });
                return;
            }

            await this.prisma.orderShipment.update({
                where: { id: shipment.id },
                data: {
                    ...baseShipmentUpdate,
                    trackingNextCheckAt: new Date(now.getTime() + pollInterval)
                }
            });
        } catch (error) {
            const attempts = shipment.trackingAttempts + 1;
            const delay = Math.min(3_600_000, 60_000 * 2 ** Math.min(attempts - 1, 6));
            await this.prisma.orderShipment.update({
                where: { id: shipment.id },
                data: {
                    trackingAttempts: attempts,
                    trackingLastError:
                        error instanceof Error ? error.message.slice(0, 500) : "Falha desconhecida",
                    trackingNextCheckAt: new Date(Date.now() + delay),
                    trackingLockedAt: null
                }
            });
        }
    }

    private emailJob(
        type: EmailJobType,
        key: "shipment-posted" | "shipment-delivered",
        shipment: Awaited<ReturnType<PrismaClient["orderShipment"]["findUniqueOrThrow"]>> & {
            order: {
                uuid: string;
                subtotalInCents: number;
                shippingInCents: number;
                discountInCents: number;
                totalInCents: number;
                user: { name: string; email: string };
                items: Array<{
                    productNameSnapshot: string;
                    quantity: number;
                    totalPriceInCents: number;
                }>;
            };
        },
        trackingCode?: string
    ) {
        return createEmailJob({
            type,
            recipient: shipment.order.user.email,
            deduplicationKey: `${key}:${shipment.order.uuid}`,
            payload: orderEmailPayload({
                customerName: shipment.order.user.name,
                orderUuid: shipment.order.uuid,
                items: shipment.order.items.map((item) => ({
                    name: item.productNameSnapshot,
                    quantity: item.quantity,
                    totalInCents: item.totalPriceInCents
                })),
                subtotalInCents: shipment.order.subtotalInCents,
                shippingInCents: shipment.order.shippingInCents,
                discountInCents: shipment.order.discountInCents,
                totalInCents: shipment.order.totalInCents,
                trackingCode
            })
        });
    }
}
