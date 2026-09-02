import * as assert from "node:assert";
import { createHmac } from "node:crypto";
import { test } from "node:test";
import { PaymentLinkStatus, PaymentStatus } from "../../../src/generated/prisma/enums";
import { PaymentService } from "../../../src/modules/payments/services/payment-service";
import {
    ABACATEPAY_WEBHOOK_PUBLIC_KEY,
    PaymentWebhookService,
    verifyAbacateWebhook
} from "../../../src/modules/payments/services/payment-webhook-service";

const key = "0195f4aa-7f18-7db5-9f32-06f4a9a2b401";

test("payment service returns the existing checkout for an idempotent retry", async () => {
    const prisma = {
        order: {
            findUnique: async () => ({
                id: 1,
                uuid: "0195f4aa-7f18-7db5-9f32-06f4a9a2b402",
                user: { uuid: "user-1" },
                paymentIdempotencyKey: key,
                payment: {
                    status: PaymentStatus.PENDING,
                    providerCheckoutId: "bill_1",
                    checkoutUrl: "https://pay.example/bill_1",
                    expectedAmountInCents: 5000
                },
                items: [],
                shipment: null
            })
        }
    };
    const client = {
        createCheckout: async () => {
            throw new Error("provider must not be called");
        }
    };
    const service = new PaymentService(prisma as never, client as never);
    const result = await service.createCheckout("user-1", "order-1", key);

    assert.equal(result.success, true);
    if (result.success) {
        assert.equal(result.value.checkoutId, "bill_1");
        assert.equal(result.value.checkoutUrl, "https://pay.example/bill_1");
    }
});

test("payment service rejects checkout before shipping confirmation", async () => {
    const prisma = {
        order: {
            findUnique: async () => ({
                id: 1,
                uuid: "0195f4aa-7f18-7db5-9f32-06f4a9a2b402",
                user: { uuid: "user-1" },
                paymentIdempotencyKey: key,
                payment: null,
                status: "PENDING",
                addressId: 2,
                totalInCents: 5000,
                items: [],
                shipment: null
            })
        }
    };
    const service = new PaymentService(prisma as never, {} as never);
    const result = await service.createCheckout("user-1", "order-1", key);
    assert.equal(result.success, false);
});

test("payment service blocks a new checkout without calling the provider when disabled", async () => {
    const previous = process.env.CHECKOUT_ENABLED;
    process.env.CHECKOUT_ENABLED = "false";
    let providerCalled = false;
    const prisma = {
        order: {
            findUnique: async () => ({
                id: 1,
                uuid: "0195f4aa-7f18-7db5-9f32-06f4a9a2b402",
                user: { uuid: "user-1" },
                paymentIdempotencyKey: key,
                payment: null,
                status: "AWAITING_PAYMENT",
                addressId: 2,
                totalInCents: 5000,
                items: [],
                shipment: { status: "CONFIRMED" }
            })
        }
    };
    const client = {
        createProduct: async () => {
            providerCalled = true;
        },
        createCheckout: async () => {
            providerCalled = true;
        },
        findCheckoutByExternalId: async () => {
            providerCalled = true;
        }
    };

    try {
        const result = await new PaymentService(prisma as never, client as never).createCheckout(
            "user-1",
            "order-1",
            key
        );

        assert.equal(result.success, false);
        if (!result.success) {
            assert.equal(result.value.code, "SERVICE_UNAVAILABLE");
            assert.equal(result.value.statusCode, 503);
        }
        assert.equal(providerCalled, false);
    } finally {
        if (previous === undefined) delete process.env.CHECKOUT_ENABLED;
        else process.env.CHECKOUT_ENABLED = previous;
    }
});

test("payment service allowlist blocks unlisted owners and cannot bypass order ownership", async () => {
    const previousMode = process.env.CHECKOUT_ROLLOUT_MODE;
    const previousUsers = process.env.CHECKOUT_ALLOWED_USER_UUIDS;
    const previousEnabled = process.env.CHECKOUT_ENABLED;
    const allowedUser = "0195f4aa-7f18-7db5-9f32-06f4a9a2b401";
    const otherUser = "0195f4aa-7f18-7db5-9f32-06f4a9a2b402";
    process.env.CHECKOUT_ENABLED = "true";
    process.env.CHECKOUT_ROLLOUT_MODE = "ALLOWLIST";
    process.env.CHECKOUT_ALLOWED_USER_UUIDS = allowedUser;
    let providerCalled = false;
    const prisma = {
        order: {
            findUnique: async () => ({
                id: 1,
                uuid: "0195f4aa-7f18-7db5-9f32-06f4a9a2b403",
                user: { uuid: otherUser },
                paymentIdempotencyKey: key,
                payment: null,
                status: "AWAITING_PAYMENT",
                addressId: 2,
                totalInCents: 5000,
                items: [],
                shipment: { status: "CONFIRMED" }
            })
        }
    };
    const client = {
        createCheckout: async () => {
            providerCalled = true;
        }
    };

    try {
        const result = await new PaymentService(prisma as never, client as never).createCheckout(
            otherUser,
            "0195f4aa-7f18-7db5-9f32-06f4a9a2b403",
            key
        );
        assert.equal(result.success, false);
        if (!result.success) assert.equal(result.value.code, "SERVICE_UNAVAILABLE");

        const spoofed = await new PaymentService(prisma as never, client as never).createCheckout(
            allowedUser,
            "0195f4aa-7f18-7db5-9f32-06f4a9a2b403",
            key
        );
        assert.equal(spoofed.success, false);
        if (!spoofed.success) assert.equal(spoofed.value.code, "RESOURCE_NOT_FOUND");
        assert.equal(providerCalled, false);
    } finally {
        if (previousEnabled === undefined) delete process.env.CHECKOUT_ENABLED;
        else process.env.CHECKOUT_ENABLED = previousEnabled;
        if (previousMode === undefined) delete process.env.CHECKOUT_ROLLOUT_MODE;
        else process.env.CHECKOUT_ROLLOUT_MODE = previousMode;
        if (previousUsers === undefined) delete process.env.CHECKOUT_ALLOWED_USER_UUIDS;
        else process.env.CHECKOUT_ALLOWED_USER_UUIDS = previousUsers;
    }
});

test("payment service reconciles a creating checkout without creating another while disabled", async () => {
    const previous = process.env.CHECKOUT_ENABLED;
    process.env.CHECKOUT_ENABLED = "false";
    let findCalls = 0;
    let createCalls = 0;
    const payment = {
        orderId: 1,
        status: PaymentStatus.CREATING,
        providerCheckoutId: null,
        checkoutUrl: null,
        expectedAmountInCents: 5000
    };
    const transactionClient = {
        order: { updateMany: async () => ({ count: 1 }) },
        orderPayment: {
            update: async () => ({
                ...payment,
                status: PaymentStatus.PENDING,
                providerCheckoutId: "bill_reconciled",
                checkoutUrl: "https://pay.example/bill_reconciled"
            })
        }
    };
    const prisma = {
        order: {
            findUnique: async () => ({
                id: 1,
                uuid: "0195f4aa-7f18-7db5-9f32-06f4a9a2b402",
                user: { uuid: "user-1" },
                paymentIdempotencyKey: key,
                payment,
                status: "AWAITING_PAYMENT",
                addressId: 2,
                totalInCents: 5000,
                items: [],
                shipment: { status: "CONFIRMED" }
            })
        },
        $transaction: async (callback: (tx: typeof transactionClient) => Promise<unknown>) =>
            callback(transactionClient)
    };
    const client = {
        findCheckoutByExternalId: async () => {
            findCalls += 1;
            return {
                id: "bill_reconciled",
                externalId: "0195f4aa-7f18-7db5-9f32-06f4a9a2b402",
                url: "https://pay.example/bill_reconciled",
                amount: 5000
            };
        },
        createCheckout: async () => {
            createCalls += 1;
        }
    };

    try {
        const result = await new PaymentService(prisma as never, client as never).createCheckout(
            "user-1",
            "order-1",
            key
        );

        assert.equal(result.success, true);
        assert.equal(findCalls, 1);
        assert.equal(createCalls, 0);
        if (result.success) assert.equal(result.value.checkoutId, "bill_reconciled");
    } finally {
        if (previous === undefined) delete process.env.CHECKOUT_ENABLED;
        else process.env.CHECKOUT_ENABLED = previous;
    }
});

test("payment service returns an existing checkout while new checkouts are disabled", async () => {
    const previous = process.env.CHECKOUT_ENABLED;
    process.env.CHECKOUT_ENABLED = "false";
    const prisma = {
        order: {
            findUnique: async () => ({
                id: 1,
                uuid: "0195f4aa-7f18-7db5-9f32-06f4a9a2b402",
                user: { uuid: "user-1" },
                paymentIdempotencyKey: key,
                payment: {
                    status: PaymentStatus.PENDING,
                    providerCheckoutId: "bill_in_flight",
                    checkoutUrl: "https://pay.example/bill_in_flight",
                    expectedAmountInCents: 5000
                },
                items: [],
                shipment: null
            })
        }
    };

    try {
        const result = await new PaymentService(prisma as never, {} as never).createCheckout(
            "user-1",
            "order-1",
            key
        );

        assert.equal(result.success, true);
        if (result.success) assert.equal(result.value.checkoutId, "bill_in_flight");
    } finally {
        if (previous === undefined) delete process.env.CHECKOUT_ENABLED;
        else process.env.CHECKOUT_ENABLED = previous;
    }
});

test("payment checkout does not subtract the promotion discount twice", async () => {
    const productPrices: number[] = [];
    let checkoutInput: Record<string, unknown> | undefined;
    const order = {
        id: 1,
        uuid: "0195f4aa-7f18-7db5-9f32-06f4a9a2b402",
        user: { uuid: "user-1" },
        paymentIdempotencyKey: key,
        payment: null,
        status: "AWAITING_PAYMENT",
        addressId: 2,
        subtotalInCents: 10000,
        shippingInCents: 1000,
        promotionDiscountInCents: 1000,
        couponDiscountInCents: 500,
        discountInCents: 1500,
        totalInCents: 9500,
        shipment: { status: "CONFIRMED" },
        items: [
            {
                uuid: "0195f4aa-7f18-7db5-9f32-06f4a9a2b403",
                productNameSnapshot: "Produto em promocao",
                productSize: "GRAMS_70",
                totalPriceInCents: 9000
            }
        ]
    };
    const transactionClient = {
        orderPayment: {
            update: async () => ({
                status: PaymentStatus.PENDING,
                providerCheckoutId: "bill_1",
                checkoutUrl: "https://pay.example/bill_1",
                expectedAmountInCents: order.totalInCents
            })
        },
        order: { updateMany: async () => ({ count: 1 }) }
    };
    const prisma = {
        order: { findUnique: async () => order },
        orderPayment: {
            create: async () => ({ orderId: order.id, status: PaymentStatus.CREATING })
        },
        paymentCatalogProduct: {
            findUnique: async () => null,
            upsert: async ({ create }: { create: { providerProductId: string } }) => create
        },
        $transaction: async (callback: (tx: typeof transactionClient) => Promise<unknown>) =>
            callback(transactionClient)
    };
    const client = {
        createProduct: async (input: { externalId: string; price: number }) => {
            productPrices.push(input.price);
            return { id: `provider:${input.externalId}` };
        },
        createCheckout: async (input: Record<string, unknown>) => {
            checkoutInput = input;
            return {
                id: "bill_1",
                externalId: order.uuid,
                url: "https://pay.example/bill_1",
                amount: order.totalInCents
            };
        }
    };

    const result = await new PaymentService(prisma as never, client as never).createCheckout(
        "user-1",
        order.uuid,
        key
    );

    assert.equal(result.success, true);
    assert.deepStrictEqual(productPrices, [8500, 1000]);
    assert.deepStrictEqual(checkoutInput?.methods, ["PIX", "CARD"]);
});

test("abacate webhook signature uses the exact raw body", () => {
    const body = Buffer.from('{"id":"evt_1","event":"checkout.completed"}');
    const signature = createHmac("sha256", ABACATEPAY_WEBHOOK_PUBLIC_KEY)
        .update(body)
        .digest("base64");

    assert.equal(verifyAbacateWebhook(body, signature), true);
    assert.equal(verifyAbacateWebhook(Buffer.from("{}"), signature), false);
});

test("checkout.completed marks payment paid and enqueues fulfillment atomically", async () => {
    const calls: string[] = [];
    const transactionClient = {
        $queryRaw: async () => [{ id: 3 }],
        orderPayment: {
            updateMany: async () => {
                calls.push("payment-paid");
                return { count: 1 };
            }
        },
        order: {
            updateMany: async () => {
                calls.push("order-paid");
                return { count: 1 };
            }
        },
        fulfillmentJob: {
            upsert: async () => {
                calls.push("fulfillment-enqueued");
            }
        },
        emailJob: {
            upsert: async () => {
                calls.push("email-enqueued");
            }
        },
        paymentWebhookEvent: {
            update: async () => {
                calls.push("event-processed");
            }
        }
    };
    const prisma = {
        paymentWebhookEvent: {
            upsert: async () => ({ processedAt: null }),
            updateMany: async () => ({ count: 1 }),
            update: async () => undefined
        },
        orderPayment: {
            findUnique: async () => ({
                id: 3,
                orderId: 7,
                expectedAmountInCents: 5000,
                paidAt: null,
                order: {
                    uuid: "order-1",
                    subtotalInCents: 5000,
                    shippingInCents: 0,
                    discountInCents: 0,
                    totalInCents: 5000,
                    user: { name: "Maria", email: "maria@example.com" },
                    items: []
                }
            })
        },
        $transaction: async (callback: (tx: typeof transactionClient) => Promise<unknown>) =>
            callback(transactionClient)
    };
    const service = new PaymentWebhookService(prisma as never);

    const result = await service.process({
        id: "evt_1",
        event: "checkout.completed",
        data: {
            checkout: {
                id: "bill_1",
                externalId: "order-1",
                amount: 5000,
                paidAmount: 5000
            },
            payerInformation: { method: "PIX" }
        }
    });

    assert.deepStrictEqual(calls, [
        "order-paid",
        "payment-paid",
        "fulfillment-enqueued",
        "email-enqueued",
        "event-processed"
    ]);
    assert.deepStrictEqual(result, { processed: true, orderUuid: "order-1" });
});

test("checkout creation persists provider checkout without reviving a cancelled order", async () => {
    let providerCalls = 0;
    let persistedCheckoutId: string | null = null;
    const order = {
        id: 1,
        uuid: "0195f4aa-7f18-7db5-9f32-06f4a9a2b402",
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
        ]
    };
    const transactionClient = {
        order: { updateMany: async () => ({ count: 0 }) },
        orderPayment: {
            update: async ({ data }: { data: { providerCheckoutId: string } }) => {
                persistedCheckoutId = data.providerCheckoutId;
                return {
                    status: PaymentStatus.PENDING,
                    providerCheckoutId: data.providerCheckoutId,
                    checkoutUrl: "https://pay.example/bill_cancelled",
                    expectedAmountInCents: 5000
                };
            }
        }
    };
    const prisma = {
        order: { findUnique: async () => order },
        orderPayment: {
            create: async () => ({ orderId: order.id, status: PaymentStatus.CREATING })
        },
        paymentCatalogProduct: {
            findUnique: async () => ({ providerProductId: "product_1" })
        },
        $transaction: async (callback: (tx: typeof transactionClient) => Promise<unknown>) =>
            callback(transactionClient)
    };
    const client = {
        createCheckout: async () => {
            providerCalls += 1;
            return {
                id: "bill_cancelled",
                externalId: order.uuid,
                url: "https://pay.example/bill_cancelled",
                amount: 5000,
                paidAmount: null,
                status: "PENDING"
            };
        }
    };

    const result = await new PaymentService(prisma as never, client as never).createCheckout(
        "user-1",
        order.uuid,
        key
    );

    assert.equal(result.success, false);
    assert.equal(providerCalls, 1);
    assert.equal(persistedCheckoutId, "bill_cancelled");
});

test("retry on cancelled order reconciles creating payment without a second checkout", async () => {
    let checkoutCreations = 0;
    let checkoutLookups = 0;
    let persistedCheckoutId: string | null = null;
    const transactionClient = {
        order: { updateMany: async () => ({ count: 0 }) },
        orderPayment: {
            update: async ({ data }: { data: { providerCheckoutId: string } }) => {
                persistedCheckoutId = data.providerCheckoutId;
                return {
                    status: PaymentStatus.PENDING,
                    providerCheckoutId: data.providerCheckoutId,
                    checkoutUrl: "https://pay.example/bill_existing",
                    expectedAmountInCents: 5000
                };
            }
        }
    };
    const prisma = {
        order: {
            findUnique: async () => ({
                id: 1,
                uuid: "order-cancelled",
                user: { uuid: "user-1" },
                paymentIdempotencyKey: key,
                payment: {
                    orderId: 1,
                    status: PaymentStatus.CREATING,
                    expectedAmountInCents: 5000
                },
                status: "CANCELLED",
                items: [],
                shipment: null
            })
        },
        $transaction: async (callback: (tx: typeof transactionClient) => Promise<unknown>) =>
            callback(transactionClient)
    };
    const client = {
        findCheckoutByExternalId: async () => {
            checkoutLookups += 1;
            return {
                id: "bill_existing",
                externalId: "order-cancelled",
                url: "https://pay.example/bill_existing",
                amount: 5000,
                paidAmount: null,
                status: "PENDING"
            };
        },
        createCheckout: async () => {
            checkoutCreations += 1;
        }
    };

    const result = await new PaymentService(prisma as never, client as never).createCheckout(
        "user-1",
        "order-cancelled",
        key
    );

    assert.equal(result.success, false);
    assert.equal(checkoutLookups, 1);
    assert.equal(checkoutCreations, 0);
    assert.equal(persistedCheckoutId, "bill_existing");
});

test("late payment on cancelled order is recorded once without fulfillment or email", async () => {
    const effects: string[] = [];
    const alerts: unknown[] = [];
    let firstFinancialTransition = true;
    const transactionClient = {
        $queryRaw: async () => [{ id: 3 }],
        order: {
            updateMany: async () => ({ count: 0 }),
            findUniqueOrThrow: async () => ({ status: "CANCELLED" })
        },
        orderPayment: {
            updateMany: async ({ data }: { data: { status: PaymentStatus } }) => {
                assert.equal(data.status, PaymentStatus.REFUND_PENDING);
                const count = firstFinancialTransition ? 1 : 0;
                firstFinancialTransition = false;
                return { count };
            }
        },
        fulfillmentJob: { upsert: async () => effects.push("fulfillment") },
        emailJob: { upsert: async () => effects.push("email") },
        paymentWebhookEvent: { update: async () => effects.push("event") }
    };
    const prisma = {
        paymentWebhookEvent: {
            upsert: async () => ({ processedAt: null }),
            updateMany: async () => ({ count: 1 })
        },
        orderPayment: {
            findUnique: async () => ({
                id: 3,
                orderId: 7,
                expectedAmountInCents: 5000,
                paidAt: null,
                order: {
                    uuid: "order-cancelled",
                    subtotalInCents: 5000,
                    shippingInCents: 0,
                    discountInCents: 0,
                    totalInCents: 5000,
                    user: { name: "Maria", email: "maria@example.com" },
                    items: []
                }
            })
        },
        $transaction: async (callback: (tx: typeof transactionClient) => Promise<unknown>) =>
            callback(transactionClient)
    };
    const service = new PaymentWebhookService(prisma as never, async (alert) => {
        alerts.push(alert);
    });
    const webhook = (id: string) =>
        service.process({
            id,
            event: "checkout.completed",
            data: {
                checkout: {
                    id: "bill_late",
                    externalId: "order-cancelled",
                    amount: 5000,
                    paidAmount: 5000
                },
                payerInformation: { method: "PIX" }
            }
        });

    const first = await webhook("evt_late_1");
    const repeated = await webhook("evt_late_2");

    assert.deepStrictEqual(first, {
        processed: true,
        orderUuid: "order-cancelled",
        refundPending: true
    });
    assert.deepStrictEqual(repeated, { processed: true, orderUuid: "order-cancelled" });
    assert.deepStrictEqual(effects, ["event", "event"]);
    assert.deepStrictEqual(alerts, [
        {
            orderUuid: "order-cancelled",
            providerCheckoutId: "bill_late",
            paidAmountInCents: 5000
        }
    ]);
});

test("processed webhook delivery is ignored without repeating effects", async () => {
    let paymentLookup = false;
    const prisma = {
        paymentWebhookEvent: {
            upsert: async () => ({ processedAt: new Date() })
        },
        orderPayment: {
            findUnique: async () => {
                paymentLookup = true;
            }
        }
    };
    const service = new PaymentWebhookService(prisma as never);
    const result = await service.process({ id: "evt_1", event: "checkout.completed" });

    assert.deepStrictEqual(result, { duplicate: true });
    assert.equal(paymentLookup, false);
});

test("checkout.completed records payment for a personalized payment link", async () => {
    const calls: string[] = [];
    const prisma = {
        paymentWebhookEvent: {
            upsert: async () => ({ processedAt: null }),
            updateMany: async () => ({ count: 1 }),
            update: async () => {
                calls.push("event-processed");
            }
        },
        orderPayment: { findUnique: async () => null },
        paymentLink: {
            findUnique: async () => ({
                id: 9,
                uuid: "0195f4aa-7f18-7db5-9f32-06f4a9a2b499",
                amountInCents: 7500,
                paidAt: null
            }),
            update: async ({ data }: { data: { status: PaymentLinkStatus } }) => {
                assert.equal(data.status, PaymentLinkStatus.PAID);
                calls.push("payment-link-paid");
            }
        },
        $transaction: async (operations: Promise<unknown>[]) => Promise.all(operations)
    };
    const service = new PaymentWebhookService(prisma as never);

    const result = await service.process({
        id: "evt_payment_link_1",
        event: "checkout.completed",
        data: {
            checkout: {
                id: "bill_link_1",
                externalId: "payment-link:0195f4aa-7f18-7db5-9f32-06f4a9a2b499",
                amount: 7500,
                paidAmount: 7500
            },
            payerInformation: { method: "PIX" }
        }
    });

    assert.deepStrictEqual(calls, ["payment-link-paid", "event-processed"]);
    assert.deepStrictEqual(result, {
        processed: true,
        paymentLinkUuid: "0195f4aa-7f18-7db5-9f32-06f4a9a2b499"
    });
});
