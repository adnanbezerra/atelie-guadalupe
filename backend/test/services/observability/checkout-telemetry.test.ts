import * as assert from "node:assert";
import { test } from "node:test";
import {
    CheckoutTelemetry,
    checkoutTelemetry,
    observeProviderRequest
} from "../../../src/modules/observability/checkout-telemetry";

test("checkout telemetry aggregates HTTP result rates and provider latency in a rolling window", () => {
    const telemetry = new CheckoutTelemetry();
    telemetry.recordCheckoutHttp(
        { route: "/orders/:orderUuid/payment", statusCode: 201, durationMs: 20 },
        1_000
    );
    telemetry.recordCheckoutHttp(
        { route: "/orders/:orderUuid/payment", statusCode: 201, durationMs: 30 },
        2_000
    );
    telemetry.recordCheckoutHttp(
        { route: "/orders/:orderUuid/payment", statusCode: 503, durationMs: 50 },
        3_000
    );
    for (let index = 0; index < 20; index += 1) {
        telemetry.recordProvider(
            {
                provider: "ABACATEPAY",
                operation: "POST /checkouts/create",
                result: "success",
                durationMs: 100
            },
            2_000
        );
    }
    telemetry.recordProvider(
        {
            provider: "ABACATEPAY",
            operation: "POST /checkouts/create",
            result: "error",
            durationMs: 900
        },
        3_000
    );

    const snapshot = telemetry.snapshot(60_000, 4_000);

    assert.deepEqual(snapshot.checkoutHttpAttempts, [
        { route: "/orders/:orderUuid/payment", statusCode: 201, count: 2, ratePerMinute: 2 },
        { route: "/orders/:orderUuid/payment", statusCode: 503, count: 1, ratePerMinute: 1 }
    ]);
    assert.deepEqual(snapshot.providerCheckoutCreations, [
        { result: "success", count: 20, ratePerMinute: 20 },
        { result: "error", count: 1, ratePerMinute: 1 }
    ]);
    assert.deepEqual(snapshot.providers, [
        {
            provider: "ABACATEPAY",
            successCount: 20,
            errorCount: 1,
            totalCount: 21,
            p95DurationMs: 100
        }
    ]);

    assert.deepEqual(telemetry.snapshot(1_000, 5_001).checkoutHttpAttempts, []);
});

test("checkout telemetry uses bounded O(1) buffers and exposes dropped observations", () => {
    const telemetry = new CheckoutTelemetry(2);
    for (let index = 0; index < 3; index += 1) {
        telemetry.recordCheckoutHttp(
            { route: "/orders/:orderUuid/payment", statusCode: 200 + index, durationMs: 10 },
            1_000 + index
        );
        telemetry.recordProvider(
            {
                provider: "ABACATEPAY",
                operation: "POST /checkouts/create",
                result: index === 2 ? "error" : "success",
                durationMs: 10
            },
            1_000 + index
        );
    }

    const snapshot = telemetry.snapshot(60_000, 2_000);
    assert.deepEqual(snapshot.droppedObservations, {
        checkoutHttpAttempts: 1,
        providerRequests: 1
    });
    assert.deepEqual(
        snapshot.checkoutHttpAttempts.map((item) => item.statusCode),
        [201, 202]
    );
    assert.deepEqual(snapshot.providerCheckoutCreations, [
        { result: "success", count: 1, ratePerMinute: 1 },
        { result: "error", count: 1, ratePerMinute: 1 }
    ]);
});

test("disabled checkout observability does not retain provider observations", () => {
    const previous = process.env.CHECKOUT_OBSERVABILITY_ENABLED;
    const before = checkoutTelemetry.snapshot(Number.MAX_SAFE_INTEGER);
    process.env.CHECKOUT_OBSERVABILITY_ENABLED = "false";
    try {
        observeProviderRequest({
            provider: "ABACATEPAY",
            operation: "POST /checkouts/create",
            result: "success",
            durationMs: 10
        });
        assert.deepEqual(checkoutTelemetry.snapshot(Number.MAX_SAFE_INTEGER), before);
    } finally {
        if (previous === undefined) delete process.env.CHECKOUT_OBSERVABILITY_ENABLED;
        else process.env.CHECKOUT_OBSERVABILITY_ENABLED = previous;
    }
});
