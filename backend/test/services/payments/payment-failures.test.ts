import * as assert from "node:assert";
import { test } from "node:test";
import { PaymentStatus } from "../../../src/generated/prisma/enums";
import { PaymentService } from "../../../src/modules/payments/services/payment-service";

const key = "0195f4aa-7f18-7db5-9f32-06f4a9a2b401";
const orderUuid = "0195f4aa-7f18-7db5-9f32-06f4a9a2b402";

function payableOrder(overrides: Record<string, unknown> = {}) {
    return {
        id: 1,
        uuid: orderUuid,
        user: { uuid: "user-1" },
        paymentIdempotencyKey: key,
        payment: null,
        status: "AWAITING_PAYMENT",
        addressId: 2,
        subtotalInCents: 5000,
        shippingInCents: 0,
        couponDiscountInCents: 0,
        totalInCents: 5000,
        shipment: { status: "CONFIRMED" },
        items: [
            {
                uuid: "0195f4aa-7f18-7db5-9f32-06f4a9a2b403",
                productNameSnapshot: "Produto",
                productSize: "GRAMS_70",
                totalPriceInCents: 5000
            }
        ],
        ...overrides
    };
}

test("payment rejects an idempotency key belonging to another order", async () => {
    let providerCalled = false;
    const prisma = { order: { findUnique: async () => payableOrder() } };
    const provider = {
        createCheckout: async () => {
            providerCalled = true;
        }
    };

    const result = await new PaymentService(prisma as never, provider as never).createCheckout(
        "user-1",
        orderUuid,
        "0195f4aa-7f18-7db5-9f32-06f4a9a2b499"
    );

    assert.equal(result.success, false);
    if (!result.success) assert.equal(result.value.statusCode, 409);
    assert.equal(providerCalled, false);
});

test("two concurrent payment creations with the same key call provider once", async () => {
    let payment: Record<string, unknown> | null = null;
    let checkoutCalls = 0;
    let releaseCheckout: (() => void) | undefined;
    const checkoutBlocked = new Promise<void>((resolve) => {
        releaseCheckout = resolve;
    });
    const transactionClient = {
        order: { updateMany: async () => ({ count: 1 }) },
        orderPayment: {
            update: async () => {
                payment = {
                    ...(payment ?? {}),
                    status: PaymentStatus.PENDING,
                    providerCheckoutId: "bill-only",
                    checkoutUrl: "https://pay.example/bill-only",
                    expectedAmountInCents: 5000
                };
                return payment;
            }
        }
    };
    const prisma = {
        order: {
            findUnique: async () => payableOrder({ payment })
        },
        orderPayment: {
            create: async () => {
                if (payment) throw Object.assign(new Error("unique"), { code: "P2002" });
                payment = {
                    orderId: 1,
                    status: PaymentStatus.CREATING,
                    expectedAmountInCents: 5000
                };
                return payment;
            },
            findUnique: async () => payment
        },
        paymentCatalogProduct: {
            findUnique: async () => ({ providerProductId: "prod-1" })
        },
        $transaction: async (callback: (tx: typeof transactionClient) => Promise<unknown>) =>
            callback(transactionClient)
    };
    const provider = {
        findCheckoutByExternalId: async () => null,
        createCheckout: async () => {
            checkoutCalls += 1;
            await checkoutBlocked;
            return {
                id: "bill-only",
                externalId: orderUuid,
                url: "https://pay.example/bill-only",
                amount: 5000,
                paidAmount: null,
                status: "PENDING"
            };
        }
    };
    const service = new PaymentService(prisma as never, provider as never);

    const first = service.createCheckout("user-1", orderUuid, key);
    await new Promise((resolve) => setImmediate(resolve));
    const second = await service.createCheckout("user-1", orderUuid, key);
    releaseCheckout?.();
    const firstResult = await first;

    assert.equal(firstResult.success, true);
    assert.equal(second.success, false);
    assert.equal(checkoutCalls, 1);
});

test("catalog failure before checkout creation releases payment for a safe retry", async () => {
    let storedPayment: Record<string, unknown> | null = null;
    let checkoutCalls = 0;
    const prisma = {
        order: { findUnique: async () => payableOrder({ payment: storedPayment }) },
        orderPayment: {
            create: async () => {
                storedPayment = {
                    id: 10,
                    orderId: 1,
                    status: PaymentStatus.CREATING,
                    expectedAmountInCents: 5000
                };
                return storedPayment;
            },
            deleteMany: async () => {
                storedPayment = null;
                return { count: 1 };
            }
        },
        paymentCatalogProduct: { findUnique: async () => null }
    };
    const provider = {
        createProduct: async () => {
            throw new Error("catalog unavailable");
        },
        createCheckout: async () => {
            checkoutCalls += 1;
        }
    };

    await assert.rejects(
        new PaymentService(prisma as never, provider as never).createCheckout(
            "user-1",
            orderUuid,
            key
        ),
        /catalog unavailable/
    );
    assert.equal(storedPayment, null);
    assert.equal(checkoutCalls, 0);
});

test("timeout before provider creates checkout leaves payment safe from duplicate retry", async () => {
    let payment: Record<string, unknown> | null = null;
    let checkoutCalls = 0;
    let lookupCalls = 0;
    const prisma = {
        order: { findUnique: async () => payableOrder({ payment }) },
        orderPayment: {
            create: async () => {
                payment = {
                    orderId: 1,
                    status: PaymentStatus.CREATING,
                    expectedAmountInCents: 5000
                };
                return payment;
            }
        },
        paymentCatalogProduct: {
            findUnique: async () => ({ providerProductId: "prod-1" })
        }
    };
    const provider = {
        createCheckout: async () => {
            checkoutCalls += 1;
            throw new Error("timeout with unknown provider result");
        },
        findCheckoutByExternalId: async () => {
            lookupCalls += 1;
            return null;
        }
    };
    const service = new PaymentService(prisma as never, provider as never);

    await assert.rejects(
        service.createCheckout("user-1", orderUuid, key),
        /timeout with unknown provider result/
    );
    const retry = await service.createCheckout("user-1", orderUuid, key);

    assert.equal(retry.success, false);
    assert.equal((payment as Record<string, unknown> | null)?.status, PaymentStatus.CREATING);
    assert.equal(checkoutCalls, 1);
    assert.equal(lookupCalls, 1);
});

test("retry reconciles checkout created before provider timeout without creating a second one", async () => {
    let payment: Record<string, unknown> | null = null;
    let remoteCheckout: Record<string, unknown> | null = null;
    let checkoutCalls = 0;
    const transactionClient = {
        order: { updateMany: async () => ({ count: 1 }) },
        orderPayment: {
            update: async ({ data }: { data: Record<string, unknown> }) => {
                payment = { ...(payment ?? {}), ...data, expectedAmountInCents: 5000 };
                return payment;
            }
        }
    };
    const prisma = {
        order: { findUnique: async () => payableOrder({ payment }) },
        orderPayment: {
            create: async () => {
                payment = {
                    id: 10,
                    orderId: 1,
                    status: PaymentStatus.CREATING,
                    expectedAmountInCents: 5000
                };
                return payment;
            }
        },
        paymentCatalogProduct: {
            findUnique: async () => ({ providerProductId: "prod-1" })
        },
        $transaction: async (callback: (tx: typeof transactionClient) => Promise<unknown>) =>
            callback(transactionClient)
    };
    const provider = {
        createCheckout: async () => {
            checkoutCalls += 1;
            remoteCheckout = {
                id: "bill-created-before-timeout",
                externalId: orderUuid,
                url: "https://pay.example/bill-created-before-timeout",
                amount: 5000,
                paidAmount: null,
                status: "PENDING"
            };
            throw new Error("timeout after provider creation");
        },
        findCheckoutByExternalId: async () => remoteCheckout
    };
    const service = new PaymentService(prisma as never, provider as never);

    await assert.rejects(
        service.createCheckout("user-1", orderUuid, key),
        /timeout after provider creation/
    );
    const retry = await service.createCheckout("user-1", orderUuid, key);

    assert.equal(retry.success, true);
    if (retry.success) assert.equal(retry.value.checkoutId, "bill-created-before-timeout");
    assert.equal(checkoutCalls, 1);
});

test("creating payment blocks reconciled checkout with divergent amount", async () => {
    let transactionCalled = false;
    let divergentCheckout: Record<string, unknown> | undefined;
    const payment = {
        orderId: 1,
        status: PaymentStatus.CREATING,
        expectedAmountInCents: 5000
    };
    const prisma = {
        order: { findUnique: async () => payableOrder({ payment }) },
        orderPayment: {
            update: async ({ data }: { data: Record<string, unknown> }) => {
                divergentCheckout = data;
                return { ...payment, ...data };
            }
        },
        $transaction: async () => {
            transactionCalled = true;
        }
    };
    const provider = {
        findCheckoutByExternalId: async () => ({
            id: "bill-wrong",
            externalId: orderUuid,
            url: "https://pay.example/bill-wrong",
            amount: 5001,
            paidAmount: null,
            status: "PENDING"
        })
    };

    await assert.rejects(
        new PaymentService(prisma as never, provider as never).createCheckout(
            "user-1",
            orderUuid,
            key
        ),
        /diverge do pedido/
    );
    assert.equal(transactionCalled, false);
    assert.equal(divergentCheckout?.providerCheckoutId, "bill-wrong");
    assert.equal(divergentCheckout?.checkoutUrl, null);
    assert.equal(divergentCheckout?.status, PaymentStatus.CREATING);
});
