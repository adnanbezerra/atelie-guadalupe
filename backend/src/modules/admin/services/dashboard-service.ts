import { PrismaClient } from "../../../generated/prisma/client";
import { FulfillmentJobStatus, OrderStatus, PaymentStatus } from "../../../generated/prisma/enums";

type DashboardInput = {
    from: string;
    to: string;
};

export class DashboardService {
    public constructor(private readonly prisma: PrismaClient) {}

    public async get(input: DashboardInput) {
        const from = new Date(input.from);
        const to = new Date(input.to);
        const orderPeriod = { createdAt: { gte: from, lte: to } };

        const [
            paidPayments,
            awaitingPaymentOrders,
            ordersToPrepare,
            ordersToShip,
            failedFulfillments,
            outOfStockProducts,
            lowStockProducts,
            priorityCandidates
        ] = await Promise.all([
            this.prisma.orderPayment.aggregate({
                where: {
                    status: PaymentStatus.PAID,
                    paidAt: { gte: from, lte: to }
                },
                _sum: { paidAmountInCents: true },
                _count: { _all: true }
            }),
            this.prisma.order.count({
                where: { ...orderPeriod, status: OrderStatus.AWAITING_PAYMENT }
            }),
            this.prisma.order.count({
                where: { ...orderPeriod, status: OrderStatus.PAID }
            }),
            this.prisma.order.count({
                where: { ...orderPeriod, status: OrderStatus.PROCESSING }
            }),
            this.prisma.fulfillmentJob.count({
                where: {
                    status: FulfillmentJobStatus.FAILED,
                    order: { is: orderPeriod }
                }
            }),
            this.prisma.product.count({
                where: { isActive: true, category: "ARTISANAL", stock: { lte: 0 } }
            }),
            this.prisma.product.count({
                where: {
                    isActive: true,
                    category: "ARTISANAL",
                    stock: { gt: 0, lte: 5 }
                }
            }),
            this.prisma.order.findMany({
                where: {
                    ...orderPeriod,
                    OR: [
                        { fulfillmentJob: { is: { status: FulfillmentJobStatus.FAILED } } },
                        {
                            status: {
                                in: [
                                    OrderStatus.PAID,
                                    OrderStatus.PROCESSING,
                                    OrderStatus.AWAITING_PAYMENT
                                ]
                            }
                        }
                    ]
                },
                include: { payment: true, shipment: true, fulfillmentJob: true },
                orderBy: { createdAt: "asc" },
                take: 100
            })
        ]);

        const paidRevenueInCents = paidPayments._sum.paidAmountInCents ?? 0;
        const paidOrders = paidPayments._count._all;
        const priorityOrders = priorityCandidates
            .sort((left, right) => this.priority(left) - this.priority(right))
            .slice(0, 10)
            .map((order) => ({
                uuid: order.uuid,
                status: order.status,
                paymentStatus: order.payment?.status ?? null,
                shipmentStatus: order.shipment?.status ?? null,
                fulfillmentStatus: order.fulfillmentJob?.status ?? null,
                totalInCents: order.totalInCents,
                placedAt: order.placedAt
            }));

        return {
            period: { from, to },
            metrics: {
                paidRevenueInCents,
                paidOrders,
                averagePaidTicketInCents:
                    paidOrders === 0 ? 0 : Math.round(paidRevenueInCents / paidOrders),
                awaitingPaymentOrders,
                ordersToPrepare,
                ordersToShip,
                failedFulfillments,
                outOfStockProducts,
                lowStockProducts
            },
            priorityOrders
        };
    }

    private priority(order: {
        status: OrderStatus;
        fulfillmentJob: { status: FulfillmentJobStatus } | null;
    }): number {
        if (order.fulfillmentJob?.status === FulfillmentJobStatus.FAILED) return 0;
        if (order.status === OrderStatus.PAID) return 1;
        if (order.status === OrderStatus.PROCESSING) return 2;
        return 3;
    }
}
