import * as assert from "node:assert";
import { createHmac } from "node:crypto";
import { test } from "node:test";
import { PaymentWebhookController } from "../../../src/modules/payments/controllers/payment-webhook-controller";
import { AbacatePayClient } from "../../../src/modules/payments/services/abacatepay-client";
import { ABACATEPAY_WEBHOOK_PUBLIC_KEY } from "../../../src/modules/payments/services/payment-webhook-service";

function productionClient() {
    return new AbacatePayClient({
        apiKey: "production-key",
        baseUrl: "https://api.abacatepay.com/v2",
        timeoutMs: 1000,
        production: true
    });
}

test("production rejects AbacatePay checkout creation response in dev mode", async (context) => {
    context.mock.method(globalThis, "fetch", async () =>
        Response.json({
            success: true,
            error: null,
            data: {
                id: "bill_dev",
                externalId: "order-1",
                url: "https://example.com/bill_dev",
                amount: 1000,
                paidAmount: null,
                status: "PENDING",
                devMode: true
            }
        })
    );

    await assert.rejects(
        productionClient().createCheckout({
            externalId: "order-1",
            items: [{ id: "prod-1", quantity: 1 }],
            methods: ["PIX"],
            metadata: {}
        }),
        (error: Error & { statusCode?: number }) =>
            error.statusCode === 503 && error.message.includes("ambiente de desenvolvimento")
    );
});

test("production rejects AbacatePay checkout query response in dev mode", async (context) => {
    context.mock.method(globalThis, "fetch", async () =>
        Response.json({
            success: true,
            error: null,
            data: [
                {
                    id: "bill_dev",
                    externalId: "order-1",
                    url: "https://example.com/bill_dev",
                    amount: 1000,
                    paidAmount: null,
                    status: "PENDING",
                    devMode: true
                }
            ]
        })
    );

    await assert.rejects(
        productionClient().findCheckoutByExternalId("order-1"),
        /ambiente de desenvolvimento/
    );
});

test("production rejects AbacatePay webhook in dev mode before processing", async () => {
    let processed = false;
    const service = {
        process: async () => {
            processed = true;
            return {};
        }
    };
    const controller = new PaymentWebhookController(service as never, true);
    const payload = Buffer.from(
        JSON.stringify({ id: "event-dev", event: "checkout.completed", devMode: true })
    );
    const signature = createHmac("sha256", ABACATEPAY_WEBHOOK_PUBLIC_KEY)
        .update(payload)
        .digest("base64");
    const request = {
        body: payload,
        query: { webhookSecret: "secret" },
        headers: { "x-webhook-signature": signature }
    };
    const previousSecret = process.env.ABACATEPAY_WEBHOOK_SECRET;
    process.env.ABACATEPAY_WEBHOOK_SECRET = "secret";

    try {
        await assert.rejects(
            controller.handle(request as never, { send: () => undefined } as never),
            (error: Error & { statusCode?: number }) =>
                error.statusCode === 503 && error.message.includes("ambiente de desenvolvimento")
        );
        assert.equal(processed, false);
    } finally {
        if (previousSecret === undefined) delete process.env.ABACATEPAY_WEBHOOK_SECRET;
        else process.env.ABACATEPAY_WEBHOOK_SECRET = previousSecret;
    }
});
