import * as assert from "node:assert";
import { test } from "node:test";
import {
    confirmPasswordResetSchema,
    requestPasswordResetSchema
} from "../../src/modules/auth/schemas/password-reset-schema";

test("password reset schemas accept valid request and confirmation", () => {
    assert.equal(requestPasswordResetSchema.safeParse({ email: "user@example.com" }).success, true);
    assert.equal(
        confirmPasswordResetSchema.safeParse({
            email: "user@example.com",
            code: "012345",
            newPassword: "NovaSenha@123"
        }).success,
        true
    );
});

test("password reset confirmation rejects malformed codes and weak passwords", () => {
    for (const code of ["12345", "1234567", "abcdef", 123456]) {
        assert.equal(
            confirmPasswordResetSchema.safeParse({
                email: "user@example.com",
                code,
                newPassword: "NovaSenha@123"
            }).success,
            false
        );
    }

    assert.equal(
        confirmPasswordResetSchema.safeParse({
            email: "user@example.com",
            code: "123456",
            newPassword: "weak"
        }).success,
        false
    );
});
