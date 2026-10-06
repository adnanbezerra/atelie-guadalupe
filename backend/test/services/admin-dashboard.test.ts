import * as assert from "node:assert";
import { test } from "node:test";
import {
    FulfillmentJobStatus,
    OrderStatus,
    PaymentStatus,
    ShippingStatus
} from "../../src/generated/prisma/enums";
import { dashboardQuerySchema } from "../../src/modules/admin/schemas/dashboard-schema";
import { DashboardService } from "../../src/modules/admin/services/dashboard-service";

test("dashboard query requires an ordered ISO period", () => {
    assert.equal(
        dashboardQuerySchema.safeParse({
            from: "2026-10-01T00:00:00.000Z",
            to: "2026-10-31T23:59:59.999Z"
        }).success,
        true
    );
    assert.equal(
        dashboardQuerySchema.safeParse({
            from: "2026-11-01T00:00:00.000Z",
            to: "2026-10-31T23:59:59.999Z"
        }).success,
        false
    );
});

test("dashboard calculates paid metrics and prioritizes failed fulfillment", async () => {
    const baseOrder = {
        uuid: "0195f4aa-7f18-7db5-9f32-06f4a9a2b501",
        status: OrderStatus.PAID,
        payment: { status: PaymentStatus.PAID },
        shipment: { status: ShippingStatus.CONFIRMED },
        fulfillmentJob: { status: FulfillmentJobStatus.PENDING },
        totalInCents: 10000,
        placedAt: new Date("2026-10-05T12:00:00.000Z")
    };
    const prisma = {
        orderPayment: {
            aggregate: async () => ({
                _sum: { paidAmountInCents: 25000 },
                _count: { _all: 2 }
            })
        },
        order: {
            count: async ({ where }: { where: { status: OrderStatus } }) =>
                where.status === OrderStatus.AWAITING_PAYMENT ? 3 : 2,
            findMany: async () => [
                baseOrder,
                {
                    ...baseOrder,
                    uuid: "0195f4aa-7f18-7db5-9f32-06f4a9a2b502",
                    status: OrderStatus.PROCESSING,
                    fulfillmentJob: { status: FulfillmentJobStatus.FAILED }
                }
            ]
        },
        fulfillmentJob: { count: async () => 1 },
        product: {
            count: async ({ where }: { where: { stock: { gt?: number } } }) =>
                typeof where.stock.gt === "number" ? 4 : 5
        }
    };

    const result = await new DashboardService(prisma as never).get({
        from: "2026-10-01T00:00:00.000Z",
        to: "2026-10-31T23:59:59.999Z"
    });

    assert.deepEqual(result.metrics, {
        paidRevenueInCents: 25000,
        paidOrders: 2,
        averagePaidTicketInCents: 12500,
        awaitingPaymentOrders: 3,
        ordersToPrepare: 2,
        ordersToShip: 2,
        failedFulfillments: 1,
        outOfStockProducts: 5,
        lowStockProducts: 4
    });
    assert.equal(result.priorityOrders[0].fulfillmentStatus, FulfillmentJobStatus.FAILED);
});
