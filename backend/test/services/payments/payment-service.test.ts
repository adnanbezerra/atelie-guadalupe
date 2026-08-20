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

test("payment checkout does not subtract the promotion discount twice", async () => {
    const productPrices: number[] = [];
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
        order: { update: async () => undefined }
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
        createCheckout: async () => ({
            id: "bill_1",
            url: "https://pay.example/bill_1",
            amount: order.totalInCents
        })
    };

    const result = await new PaymentService(prisma as never, client as never).createCheckout(
        "user-1",
        order.uuid,
        key
    );

    assert.equal(result.success, true);
    assert.deepStrictEqual(productPrices, [8500, 1000]);
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
        orderPayment: {
            update: async () => {
                calls.push("payment-paid");
            }
        },
        order: {
            updateMany: async () => {
                calls.push("order-paid");
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
        "payment-paid",
        "order-paid",
        "fulfillment-enqueued",
        "email-enqueued",
        "event-processed"
    ]);
    assert.deepStrictEqual(result, { processed: true, orderUuid: "order-1" });
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
