import * as assert from "node:assert";
import { test } from "node:test";
import {
    checkoutAllowedUserUuids,
    isCheckoutCreationEnabled
} from "../../../src/modules/payments/services/checkout-availability";

const userUuid = "0195f4aa-7f18-7db5-9f32-06f4a9a2b401";
const order = { flow: "ORDER", userUuid } as const;
const paymentLink = { flow: "PAYMENT_LINK" } as const;

test("checkout creation defaults to enabled outside production", () => {
    assert.equal(isCheckoutCreationEnabled(order, { NODE_ENV: "test" }), true);
    assert.equal(isCheckoutCreationEnabled(paymentLink, { NODE_ENV: "test" }), true);
});

test("checkout creation honors explicit true and false", () => {
    assert.equal(
        isCheckoutCreationEnabled(order, {
            NODE_ENV: "production",
            CHECKOUT_ENABLED: "true",
            CHECKOUT_ROLLOUT_MODE: "PUBLIC"
        }),
        true
    );
    assert.equal(
        isCheckoutCreationEnabled(order, {
            NODE_ENV: "development",
            CHECKOUT_ENABLED: "false"
        }),
        false
    );
});

test("checkout creation fails closed for missing or invalid production configuration", () => {
    assert.equal(isCheckoutCreationEnabled(order, { NODE_ENV: "production" }), false);
    assert.equal(
        isCheckoutCreationEnabled(order, {
            NODE_ENV: "production",
            CHECKOUT_ENABLED: "invalid",
            CHECKOUT_ROLLOUT_MODE: "PUBLIC"
        }),
        false
    );
    assert.equal(
        isCheckoutCreationEnabled(order, {
            NODE_ENV: "production",
            CHECKOUT_ENABLED: "true"
        }),
        false
    );
});

test("allowlist permits only listed order owners and blocks payment links", () => {
    const environment = {
        NODE_ENV: "production",
        CHECKOUT_ENABLED: "true",
        CHECKOUT_ROLLOUT_MODE: "ALLOWLIST",
        CHECKOUT_ALLOWED_USER_UUIDS: userUuid
    };
    assert.equal(isCheckoutCreationEnabled(order, environment), true);
    assert.equal(
        isCheckoutCreationEnabled(
            { flow: "ORDER", userUuid: "0195f4aa-7f18-7db5-9f32-06f4a9a2b402" },
            environment
        ),
        false
    );
    assert.equal(isCheckoutCreationEnabled(paymentLink, environment), false);
});

test("rollout rejects malformed, duplicate or residual allowlists", () => {
    assert.equal(
        checkoutAllowedUserUuids({ CHECKOUT_ALLOWED_USER_UUIDS: `${userUuid},${userUuid}` }),
        null
    );
    assert.equal(
        isCheckoutCreationEnabled(order, {
            CHECKOUT_ENABLED: "true",
            CHECKOUT_ROLLOUT_MODE: "ALLOWLIST",
            CHECKOUT_ALLOWED_USER_UUIDS: "not-a-uuid"
        }),
        false
    );
    assert.equal(
        isCheckoutCreationEnabled(order, {
            CHECKOUT_ENABLED: "true",
            CHECKOUT_ROLLOUT_MODE: "PUBLIC",
            CHECKOUT_ALLOWED_USER_UUIDS: userUuid
        }),
        false
    );
    const tooMany = Array.from(
        { length: 101 },
        (_, index) => `0195f4aa-7f18-7db5-9f32-${index.toString(16).padStart(12, "0")}`
    ).join(",");
    assert.equal(checkoutAllowedUserUuids({ CHECKOUT_ALLOWED_USER_UUIDS: tooMany }), null);
});
