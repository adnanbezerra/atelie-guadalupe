import * as assert from "node:assert";
import { test } from "node:test";
import { paymentIdempotencyHeaderSchema } from "../../../src/modules/payments/payment-schema";

test("payment header rejects missing and invalid idempotency keys", () => {
    assert.equal(paymentIdempotencyHeaderSchema.safeParse({}).success, false);
    assert.equal(
        paymentIdempotencyHeaderSchema.safeParse({ "idempotency-key": "not-a-uuid" }).success,
        false
    );
    assert.equal(
        paymentIdempotencyHeaderSchema.safeParse({
            "idempotency-key": "0195f4aa-7f18-7db5-9f32-06f4a9a2b401"
        }).success,
        true
    );
});
