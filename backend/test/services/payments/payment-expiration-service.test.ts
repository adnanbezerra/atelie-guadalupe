import * as assert from "node:assert";
import { test } from "node:test";
import { OrderStatus, PaymentStatus, ProductSize } from "../../../src/generated/prisma/enums";
import { PaymentExpirationService } from "../../../src/modules/payments/services/payment-expiration-service";

test("expires stale payment and returns order items to cart", async () => {
    const previousMinutes = process.env.PAYMENT_EXPIRATION_MINUTES;
    process.env.PAYMENT_EXPIRATION_MINUTES = "15";
    const now = new Date("2026-10-02T12:00:00.000Z");
    const paymentUpdates: Array<Record<string, unknown>> = [];
    const cartItems: Array<Record<string, unknown>> = [];
    let orderCancelled = 0;
    const transactionClient = {
        $queryRaw: async () => [{ id: 7 }],
        orderPayment: {
            findUnique: async () => ({
                id: 7,
                orderId: 3,
                status: PaymentStatus.PENDING,
                updatedAt: new Date("2026-10-02T11:44:59.000Z"),
                order: {
                    userId: 5,
                    status: OrderStatus.AWAITING_PAYMENT,
                    items: [
                        {
                            productId: 11,
                            productSize: ProductSize.GRAMS_70,
                            quantity: 2,
                            unitPriceInCents: 1800,
                            productNameSnapshot: "Sabonete"
                        },
                        {
                            productId: 12,
                            productSize: ProductSize.GRAMS_100,
                            quantity: 1,
                            unitPriceInCents: 2500,
                            productNameSnapshot: "Creme"
                        }
                    ]
                }
            }),
            update: async ({ data }: { data: Record<string, unknown> }) => {
                paymentUpdates.push(data);
            }
        },
        order: {
            updateMany: async () => {
                orderCancelled += 1;
                return { count: 1 };
            }
        },
        cart: { upsert: async () => ({ id: 9 }) },
        cartItem: {
            upsert: async (args: Record<string, unknown>) => {
                cartItems.push(args);
            }
        }
    };
    const prisma = {
        orderPayment: {
            findMany: async ({ where }: { where: { updatedAt: { lte: Date } } }) => {
                assert.equal(where.updatedAt.lte.toISOString(), "2026-10-02T11:45:00.000Z");
                return [{ id: 7 }];
            }
        },
        $transaction: async (callback: (tx: typeof transactionClient) => Promise<unknown>) =>
            callback(transactionClient)
    };

    try {
        const result = await new PaymentExpirationService(prisma as never).processDue(now);

        assert.deepStrictEqual(result, { expired: 1 });
        assert.equal(orderCancelled, 1);
        assert.deepStrictEqual(paymentUpdates, [{ status: PaymentStatus.EXPIRED }]);
        assert.equal(cartItems.length, 2);
        assert.deepStrictEqual(cartItems[0].update, {
            quantity: { increment: 2 },
            status: "ACTIVE"
        });
        assert.deepStrictEqual(cartItems[1].update, {
            quantity: { increment: 1 },
            status: "ACTIVE"
        });
    } finally {
        if (previousMinutes === undefined) delete process.env.PAYMENT_EXPIRATION_MINUTES;
        else process.env.PAYMENT_EXPIRATION_MINUTES = previousMinutes;
    }
});

test("does not expire payment completed while worker was waiting", async () => {
    let mutations = 0;
    const transactionClient = {
        $queryRaw: async () => [{ id: 7 }],
        orderPayment: {
            findUnique: async () => ({
                id: 7,
                status: PaymentStatus.PAID,
                updatedAt: new Date("2026-10-02T11:00:00.000Z"),
                order: { status: OrderStatus.PAID, items: [] }
            })
        },
        order: { updateMany: async () => (mutations += 1) }
    };
    const prisma = {
        orderPayment: { findMany: async () => [{ id: 7 }] },
        $transaction: async (callback: (tx: typeof transactionClient) => Promise<unknown>) =>
            callback(transactionClient)
    };

    const result = await new PaymentExpirationService(prisma as never).processDue(
        new Date("2026-10-02T12:00:00.000Z")
    );

    assert.deepStrictEqual(result, { expired: 0 });
    assert.equal(mutations, 0);
});
