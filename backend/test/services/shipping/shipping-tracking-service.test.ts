import * as assert from "node:assert";
import { test } from "node:test";
import { OrderStatus, ShippingStatus } from "../../../src/generated/prisma/enums";
import { ShippingTrackingService } from "../../../src/modules/shipping/shipping-tracking-service";

function shipment(status: OrderStatus) {
    return {
        id: 1,
        uuid: "shipment-1",
        orderId: 10,
        status: ShippingStatus.LABEL_PURCHASED,
        superfreteOrderId: "sf-1",
        superfreteStatus: "released",
        trackingCode: "AA123BR",
        postedAt: null,
        deliveredAt: null,
        cancelledAt: null,
        trackingAttempts: 0,
        order: {
            id: 10,
            uuid: "order-1",
            status,
            subtotalInCents: 5000,
            shippingInCents: 1000,
            discountInCents: 0,
            totalInCents: 6000,
            user: {
                name: "Maria",
                email: "maria@example.com"
            },
            items: [
                {
                    productNameSnapshot: "Sabonete",
                    quantity: 2,
                    totalPriceInCents: 5000
                }
            ]
        }
    };
}

async function processProviderStatus(providerStatus: string, orderStatus: OrderStatus) {
    const current = shipment(orderStatus);
    const emailKeys: string[] = [];
    let savedOrderStatus: OrderStatus | null = null;
    let savedShipment: Record<string, unknown> | null = null;

    const tx = {
        orderShipment: {
            update: async ({ data }: { data: Record<string, unknown> }) => {
                savedShipment = data;
            }
        },
        order: {
            update: async ({ data }: { data: { status: OrderStatus } }) => {
                savedOrderStatus = data.status;
            }
        },
        emailJob: {
            upsert: async ({ where }: { where: { deduplicationKey: string } }) => {
                emailKeys.push(where.deduplicationKey);
            }
        }
    };
    const prisma = {
        orderShipment: {
            updateMany: async ({ data }: { data: Record<string, unknown> }) => ({
                count: data.trackingLockedAt instanceof Date ? 1 : 0
            }),
            findMany: async () => [{ id: 1 }],
            findUniqueOrThrow: async () => current,
            update: async () => undefined
        },
        $transaction: async (callback: (client: typeof tx) => Promise<unknown>) => callback(tx)
    };
    const superFrete = {
        getOrderInfo: async () => ({
            id: "sf-1",
            status: providerStatus,
            tracking: "AA123BR",
            posted_at: "2026-08-03T12:00:00.000Z"
        })
    };

    await new ShippingTrackingService(prisma as never, superFrete as never).processDue();

    return { emailKeys, savedOrderStatus, savedShipment };
}

test("tracking worker marks a posted order as shipped and enqueues one email", async () => {
    const result = await processProviderStatus("posted", OrderStatus.PROCESSING);

    assert.equal(result.savedOrderStatus, OrderStatus.SHIPPED);
    assert.deepStrictEqual(result.emailKeys, ["shipment-posted:order-1"]);
    const savedShipment = result.savedShipment as Record<string, unknown> | null;
    assert.equal(savedShipment?.superfreteStatus, "posted");
    assert.equal(savedShipment?.trackingCode, "AA123BR");
});

test("tracking worker jumps directly to delivered without enqueuing a late shipped email", async () => {
    const result = await processProviderStatus("delivered", OrderStatus.PROCESSING);

    assert.equal(result.savedOrderStatus, OrderStatus.DELIVERED);
    assert.deepStrictEqual(result.emailKeys, ["shipment-delivered:order-1"]);
    const savedShipment = result.savedShipment as Record<string, unknown> | null;
    assert.equal(savedShipment?.trackingNextCheckAt, null);
});
