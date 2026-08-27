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

test("checkout lookup follows provider cursor when result is not on first page", async (context) => {
    const requestedUrls: string[] = [];
    context.mock.method(globalThis, "fetch", async (input: string | URL | Request) => {
        const url = String(input);
        requestedUrls.push(url);
        if (!url.includes("after=cursor-2")) {
            return Response.json({
                success: true,
                error: null,
                data: [],
                pagination: { hasMore: true, next: "cursor-2" }
            });
        }
        return Response.json({
            success: true,
            error: null,
            data: [
                {
                    id: "bill_second_page",
                    externalId: "order-second-page",
                    url: "https://example.com/bill_second_page",
                    amount: 1000,
                    paidAmount: null,
                    status: "PENDING"
                }
            ],
            pagination: { hasMore: false, next: null }
        });
    });
    const client = new AbacatePayClient({
        apiKey: "test-key",
        baseUrl: "https://api.abacatepay.com/v2",
        timeoutMs: 1000
    });

    const checkout = await client.findCheckoutByExternalId("order-second-page");

    assert.equal(checkout?.id, "bill_second_page");
    assert.equal(requestedUrls.length, 2);
    assert.match(requestedUrls[0], /externalId=order-second-page/);
    assert.match(requestedUrls[1], /after=cursor-2/);
});

test("checkout lookup rejects a repeated provider pagination cursor", async (context) => {
    context.mock.method(globalThis, "fetch", async () =>
        Response.json({
            success: true,
            error: null,
            data: [],
            pagination: { hasMore: true, next: "same-cursor" }
        })
    );
    const client = new AbacatePayClient({
        apiKey: "test-key",
        baseUrl: "https://api.abacatepay.com/v2",
        timeoutMs: 1000
    });

    await assert.rejects(
        client.findCheckoutByExternalId("missing-order"),
        /cursor de paginacao repetido/
    );
});

test("webhook rejects missing or invalid secret before processing", async () => {
    let processed = false;
    const controller = new PaymentWebhookController(
        {
            process: async () => {
                processed = true;
                return {};
            }
        } as never,
        false
    );
    const payload = Buffer.from(JSON.stringify({ id: "event-1", event: "checkout.completed" }));
    const signature = createHmac("sha256", ABACATEPAY_WEBHOOK_PUBLIC_KEY)
        .update(payload)
        .digest("base64");
    const previousSecret = process.env.ABACATEPAY_WEBHOOK_SECRET;
    process.env.ABACATEPAY_WEBHOOK_SECRET = "expected-secret";

    try {
        for (const webhookSecret of [undefined, "wrong-secret"]) {
            await assert.rejects(
                controller.handle(
                    {
                        body: payload,
                        query: { webhookSecret },
                        headers: { "x-webhook-signature": signature }
                    } as never,
                    { send: () => undefined } as never
                ),
                (error: Error & { statusCode?: number }) => error.statusCode === 401
            );
        }
        assert.equal(processed, false);
    } finally {
        if (previousSecret === undefined) delete process.env.ABACATEPAY_WEBHOOK_SECRET;
        else process.env.ABACATEPAY_WEBHOOK_SECRET = previousSecret;
    }
});

test("webhook rejects invalid signature and altered raw body", async () => {
    let processed = false;
    const controller = new PaymentWebhookController(
        {
            process: async () => {
                processed = true;
                return {};
            }
        } as never,
        false
    );
    const signedBody = Buffer.from(JSON.stringify({ id: "event-1", event: "checkout.completed" }));
    const alteredBody = Buffer.from(
        JSON.stringify({ id: "event-1", event: "checkout.completed", altered: true })
    );
    const validSignature = createHmac("sha256", ABACATEPAY_WEBHOOK_PUBLIC_KEY)
        .update(signedBody)
        .digest("base64");
    const previousSecret = process.env.ABACATEPAY_WEBHOOK_SECRET;
    process.env.ABACATEPAY_WEBHOOK_SECRET = "expected-secret";

    try {
        for (const [body, signature] of [
            [signedBody, "invalid-signature"],
            [alteredBody, validSignature]
        ] as const) {
            await assert.rejects(
                controller.handle(
                    {
                        body,
                        query: { webhookSecret: "expected-secret" },
                        headers: { "x-webhook-signature": signature }
                    } as never,
                    { send: () => undefined } as never
                ),
                (error: Error & { statusCode?: number }) => error.statusCode === 401
            );
        }
        assert.equal(processed, false);
    } finally {
        if (previousSecret === undefined) delete process.env.ABACATEPAY_WEBHOOK_SECRET;
        else process.env.ABACATEPAY_WEBHOOK_SECRET = previousSecret;
    }
});
