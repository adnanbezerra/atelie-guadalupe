import * as assert from "node:assert";
import { test } from "node:test";
import { isCheckoutCreationEnabled } from "../../../src/modules/payments/services/checkout-availability";

test("checkout creation defaults to enabled outside production", () => {
    assert.equal(isCheckoutCreationEnabled({ NODE_ENV: "test" } as NodeJS.ProcessEnv), true);
});

test("checkout creation honors explicit true and false", () => {
    assert.equal(
        isCheckoutCreationEnabled({ NODE_ENV: "production", CHECKOUT_ENABLED: "true" }),
        true
    );
    assert.equal(
        isCheckoutCreationEnabled({ NODE_ENV: "development", CHECKOUT_ENABLED: "false" }),
        false
    );
});

test("checkout creation fails closed for missing or invalid production configuration", () => {
    assert.equal(isCheckoutCreationEnabled({ NODE_ENV: "production" }), false);
    assert.equal(
        isCheckoutCreationEnabled({ NODE_ENV: "production", CHECKOUT_ENABLED: "invalid" }),
        false
    );
});
