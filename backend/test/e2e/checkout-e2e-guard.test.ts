import * as assert from "node:assert";
import { test } from "node:test";
import {
    assertCheckoutE2eSafety,
    checkoutE2eQuotePayload,
    checkoutE2eSkipReason
} from "./checkout-e2e-guard";

const safeEnvironment = {
    NODE_ENV: "test",
    CHECKOUT_E2E_ALLOW_DATABASE_WRITES: "true",
    ABACATEPAY_API_KEY: "abc_dev_redacted",
    SUPERFRETE_BASE_URL: "https://sandbox.superfrete.com/api/v0",
    DATABASE_URL: "postgresql://redacted/test",
    SEED_ADMIN_EMAIL: "redacted@example.test",
    SEED_ADMIN_PASSWORD: "redacted",
    SEED_ADMIN_DOCUMENT: "redacted",
    ABACATEPAY_WEBHOOK_SECRET: "redacted",
    SUPERFRETE_TOKEN: "redacted",
    SUPERFRETE_USER_AGENT: "redacted"
};

test("checkout E2E guard accepts explicit sandbox configuration", () => {
    assert.deepStrictEqual(assertCheckoutE2eSafety(safeEnvironment), {
        superFreteBaseUrl: "https://sandbox.superfrete.com/api/v0"
    });
});

test("checkout E2E opt-in fails closed instead of skipping missing configuration", () => {
    assert.equal(checkoutE2eSkipReason(true), false);
    assert.throws(
        () =>
            assertCheckoutE2eSafety({
                RUN_CHECKOUT_E2E: "true",
                CHECKOUT_E2E_ALLOW_DATABASE_WRITES: "true"
            }),
        /variaveis obrigatorias ausentes/
    );
});

test("checkout E2E quote uses the persisted order destination", () => {
    assert.deepStrictEqual(
        checkoutE2eQuotePayload("88010000", "0195f4aa-7f18-7db5-9f32-06f4a9a2b401"),
        {
            zipCode: "88010000",
            items: [
                {
                    productUuid: "0195f4aa-7f18-7db5-9f32-06f4a9a2b401",
                    productSize: "GRAMS_70",
                    quantity: 1
                }
            ]
        }
    );
});

test("checkout E2E guard rejects production, missing DB consent and unsafe providers", () => {
    for (const override of [
        { NODE_ENV: "production" },
        { CHECKOUT_E2E_ALLOW_DATABASE_WRITES: undefined },
        { ABACATEPAY_API_KEY: "abc_live_redacted" },
        { SUPERFRETE_BASE_URL: "https://api.superfrete.com/api/v0" }
    ]) {
        assert.throws(
            () => assertCheckoutE2eSafety({ ...safeEnvironment, ...override }),
            /E2E recusado/
        );
    }
});
