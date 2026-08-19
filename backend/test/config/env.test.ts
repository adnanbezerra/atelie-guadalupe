import * as assert from "node:assert";
import { test } from "node:test";
import { validateEnv } from "../../src/config/env";

const validEnvironment: NodeJS.ProcessEnv = {
    NODE_ENV: "production",
    PORT: "3000",
    DATABASE_URL: "postgresql://user:password@database.example.com:5432/app",
    JWT_SECRET: "production-secret",
    CORS_ORIGIN: "https://atelie.example.com,https://admin.atelie.example.com",
    MONGODB_URL: "mongodb://database.example.com:27017",
    MONGODB_DB_NAME: "media",
    SUPERFRETE_TOKEN: "superfrete-token",
    SUPERFRETE_USER_AGENT: "Atelie Guadalupe (tech@example.com)",
    ABACATEPAY_API_KEY: "abacatepay-key",
    ABACATEPAY_RETURN_URL: "https://atelie.example.com/checkout",
    ABACATEPAY_COMPLETION_URL: "https://atelie.example.com/checkout/success",
    ABACATEPAY_WEBHOOK_SECRET: "webhook-secret",
    PAYMENT_LINK_PUBLIC_BASE_URL: "https://atelie.example.com/checkout/manual",
    RESEND_API_KEY: "resend-key",
    EMAIL_FROM: "Atelie Guadalupe <contato@example.com>",
    FRONTEND_URL: "https://atelie.example.com"
};

test("environment validation accepts a complete production configuration", () => {
    const environment = validateEnv(validEnvironment);

    assert.equal(environment.PORT, 3000);
    assert.equal(environment.SUPERFRETE_TIMEOUT_MS, 15000);
    assert.equal(environment.EMAIL_WORKER_ENABLED, "true");
});

test("environment validation reports all missing production variables", () => {
    assert.throws(
        () => validateEnv({ NODE_ENV: "production" }),
        (error: Error) =>
            error.message.includes("DATABASE_URL: obrigatoria") &&
            error.message.includes("ABACATEPAY_API_KEY: obrigatoria") &&
            error.message.includes("RESEND_API_KEY: obrigatoria")
    );
});

test("environment validation rejects malformed values", () => {
    assert.throws(
        () =>
            validateEnv({
                ...validEnvironment,
                PORT: "70000",
                CORS_ORIGIN: "not-a-url",
                SUPERFRETE_TIMEOUT_MS: "zero"
            }),
        (error: Error) =>
            error.message.includes("PORT") &&
            error.message.includes("CORS_ORIGIN") &&
            error.message.includes("SUPERFRETE_TIMEOUT_MS")
    );
});

test("test environment allows disabled external integrations", () => {
    const environment = validateEnv({
        NODE_ENV: "test",
        DATABASE_URL: "postgresql://postgres:postgres@localhost:5432/test",
        JWT_SECRET: "test-secret",
        MONGODB_URL: "",
        MONGODB_DB_NAME: ""
    });

    assert.equal(environment.MONGODB_URL, undefined);
    assert.equal(environment.ABACATEPAY_API_KEY, undefined);
});
