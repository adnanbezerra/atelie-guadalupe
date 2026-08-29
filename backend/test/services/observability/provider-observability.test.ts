import * as assert from "node:assert";
import { test } from "node:test";
import { AbacatePayClient } from "../../../src/modules/payments/services/abacatepay-client";
import { SuperFreteClient } from "../../../src/modules/shipping/services/superfrete-client";
import { ProviderRequestObservation } from "../../../src/modules/observability/checkout-telemetry";

test("provider clients report successful and failed requests to telemetry", async () => {
    const originalFetch = global.fetch;
    const observations: ProviderRequestObservation[] = [];
    try {
        global.fetch = async () =>
            new Response(
                JSON.stringify({ success: true, error: null, data: { id: "product-1" } }),
                {
                    status: 200,
                    headers: { "content-type": "application/json" }
                }
            );
        const abacate = new AbacatePayClient(
            { apiKey: "dev", baseUrl: "https://provider.invalid", timeoutMs: 100 },
            (item) => observations.push(item)
        );
        await abacate.createProduct({ externalId: "test", name: "Test", price: 100 });

        global.fetch = async () => new Response("failure", { status: 500 });
        const superfrete = new SuperFreteClient(
            {
                token: "token",
                userAgent: "test",
                baseUrl: "https://provider.invalid",
                timeoutMs: 100
            },
            (item) => observations.push(item)
        );
        await assert.rejects(() => superfrete.getOrderInfo("order-1"));

        assert.equal(observations[0].provider, "ABACATEPAY");
        assert.equal(observations[0].result, "success");
        assert.equal(observations[1].provider, "SUPERFRETE");
        assert.equal(observations[1].result, "error");
    } finally {
        global.fetch = originalFetch;
    }
});

test("provider request result is preserved when telemetry observer throws", async () => {
    const originalFetch = global.fetch;
    const brokenObserver = () => {
        throw new Error("telemetry unavailable");
    };
    try {
        global.fetch = async () =>
            new Response(
                JSON.stringify({ success: true, error: null, data: { id: "product-1" } }),
                { status: 200, headers: { "content-type": "application/json" } }
            );
        const abacate = new AbacatePayClient(
            { apiKey: "dev", baseUrl: "https://provider.invalid", timeoutMs: 100 },
            brokenObserver
        );
        assert.deepEqual(
            await abacate.createProduct({ externalId: "test", name: "Test", price: 100 }),
            {
                id: "product-1"
            }
        );

        global.fetch = async () => new Response("provider failure", { status: 500 });
        const superfrete = new SuperFreteClient(
            {
                token: "token",
                userAgent: "test",
                baseUrl: "https://provider.invalid",
                timeoutMs: 100
            },
            brokenObserver
        );
        await assert.rejects(
            () => superfrete.getOrderInfo("order-1"),
            (error: Error) =>
                error.message.includes("SuperFrete respondeu com erro 500") &&
                !error.message.includes("telemetry unavailable")
        );
    } finally {
        global.fetch = originalFetch;
    }
});
