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
    SUPERFRETE_BASE_URL: "https://api.superfrete.com/api/v0",
    SUPERFRETE_TOKEN: "superfrete-token",
    SUPERFRETE_USER_AGENT: "Atelie Guadalupe (tech@example.com)",
    SUPERFRETE_EXPECTED_ENVIRONMENT: "production",
    ABACATEPAY_API_KEY: "abacatepay-key",
    ABACATEPAY_RETURN_URL: "https://atelie.example.com/checkout",
    ABACATEPAY_COMPLETION_URL: "https://atelie.example.com/checkout/success",
    ABACATEPAY_WEBHOOK_SECRET: "webhook-secret",
    ABACATEPAY_EXPECTED_DEV_MODE: "false",
    PAYMENT_LINK_PUBLIC_BASE_URL: "https://atelie.example.com/checkout/manual",
    RESEND_API_KEY: "resend-key",
    EMAIL_FROM: "Atelie Guadalupe <contato@example.com>",
    FRONTEND_URL: "https://atelie.example.com",
    CHECKOUT_ENABLED: "true"
};

test("environment validation accepts a complete production configuration", () => {
    const environment = validateEnv(validEnvironment);

    assert.equal(environment.PORT, 3000);
    assert.equal(environment.SUPERFRETE_TIMEOUT_MS, 15000);
    assert.equal(environment.EMAIL_WORKER_ENABLED, "true");
    assert.equal(environment.CHECKOUT_ENABLED, "true");
    assert.equal(environment.FULFILLMENT_WORKER_MAX_ATTEMPTS, 8);
    assert.equal(environment.ABACATEPAY_EXPECTED_DEV_MODE, "false");
});

test("production requires explicit SuperFrete URL, environment and checkout flag", () => {
    const {
        SUPERFRETE_BASE_URL: _baseUrl,
        SUPERFRETE_EXPECTED_ENVIRONMENT: _superFreteEnvironment,
        CHECKOUT_ENABLED: _checkout,
        ...environment
    } = validEnvironment;

    assert.throws(
        () => validateEnv(environment),
        (error: Error) =>
            error.message.includes("SUPERFRETE_BASE_URL: obrigatoria em producao") &&
            error.message.includes(
                "SUPERFRETE_EXPECTED_ENVIRONMENT: obrigatoria em producao"
            ) &&
            error.message.includes("CHECKOUT_ENABLED: obrigatoria em producao")
    );
});

test("production accepts explicitly expected SuperFrete sandbox configuration", () => {
    const environment = validateEnv({
        ...validEnvironment,
        SUPERFRETE_BASE_URL: "https://sandbox.superfrete.com/api/v0",
        SUPERFRETE_EXPECTED_ENVIRONMENT: "sandbox"
    });

    assert.equal(environment.SUPERFRETE_EXPECTED_ENVIRONMENT, "sandbox");
});

test("production rejects SuperFrete URL and expected environment mismatch", () => {
    assert.throws(
        () =>
            validateEnv({
                ...validEnvironment,
                SUPERFRETE_BASE_URL: "https://sandbox.superfrete.com/api/v0"
            }),
        /SUPERFRETE_BASE_URL.*SUPERFRETE_EXPECTED_ENVIRONMENT=production/
    );
    assert.throws(
        () =>
            validateEnv({
                ...validEnvironment,
                SUPERFRETE_EXPECTED_ENVIRONMENT: "sandbox"
            }),
        /SUPERFRETE_BASE_URL.*SUPERFRETE_EXPECTED_ENVIRONMENT=sandbox/
    );
    assert.throws(
        () =>
            validateEnv({
                ...validEnvironment,
                SUPERFRETE_EXPECTED_ENVIRONMENT: "staging"
            }),
        /SUPERFRETE_EXPECTED_ENVIRONMENT/
    );
});

test("development rejects SuperFrete URL and expected environment mismatch", () => {
    assert.throws(
        () =>
            validateEnv({
                ...validEnvironment,
                NODE_ENV: "development",
                SUPERFRETE_BASE_URL: "https://api.superfrete.com/api/v0",
                SUPERFRETE_EXPECTED_ENVIRONMENT: "sandbox"
            }),
        /SUPERFRETE_BASE_URL.*SUPERFRETE_EXPECTED_ENVIRONMENT=sandbox/
    );
    assert.throws(
        () =>
            validateEnv({
                ...validEnvironment,
                NODE_ENV: "development",
                SUPERFRETE_BASE_URL: "https://sandbox.superfrete.com/api/v0",
                SUPERFRETE_EXPECTED_ENVIRONMENT: "production"
            }),
        /SUPERFRETE_BASE_URL.*SUPERFRETE_EXPECTED_ENVIRONMENT=production/
    );
    assert.throws(
        () =>
            validateEnv({
                ...validEnvironment,
                NODE_ENV: "development",
                SUPERFRETE_BASE_URL: undefined,
                SUPERFRETE_EXPECTED_ENVIRONMENT: "production"
            }),
        /SUPERFRETE_BASE_URL.*SUPERFRETE_EXPECTED_ENVIRONMENT=production/
    );
});

test("production rejects a known AbacatePay development key", () => {
    assert.throws(
        () => validateEnv({ ...validEnvironment, ABACATEPAY_API_KEY: "abc_dev_example" }),
        /ABACATEPAY_API_KEY: chave de desenvolvimento nao permitida em producao/
    );
});

test("production permits a development key only when dev mode is explicitly expected", () => {
    const environment = validateEnv({
        ...validEnvironment,
        ABACATEPAY_API_KEY: "abc_dev_example",
        ABACATEPAY_EXPECTED_DEV_MODE: "true"
    });

    assert.equal(environment.ABACATEPAY_EXPECTED_DEV_MODE, "true");
});

test("production requires a development key when dev mode is expected", () => {
    assert.throws(
        () =>
            validateEnv({
                ...validEnvironment,
                ABACATEPAY_EXPECTED_DEV_MODE: "true"
            }),
        /ABACATEPAY_API_KEY: deve ser chave de desenvolvimento/
    );
});

test("production requires an explicit expected AbacatePay dev mode", () => {
    const { ABACATEPAY_EXPECTED_DEV_MODE: _expected, ...environment } = validEnvironment;

    assert.throws(
        () => validateEnv(environment),
        /ABACATEPAY_EXPECTED_DEV_MODE: obrigatoria em producao/
    );
    assert.throws(
        () => validateEnv({ ...validEnvironment, ABACATEPAY_EXPECTED_DEV_MODE: "yes" }),
        /ABACATEPAY_EXPECTED_DEV_MODE/
    );
});

test("production rejects local, private, insecure and sandbox public URLs", () => {
    assert.throws(
        () =>
            validateEnv({
                ...validEnvironment,
                ABACATEPAY_RETURN_URL: "http://localhost:3000/checkout",
                ABACATEPAY_COMPLETION_URL: "https://192.168.1.10/success",
                PAYMENT_LINK_PUBLIC_BASE_URL: "https://sandbox.atelie.example.com/manual",
                FRONTEND_URL: "http://atelie.example.com",
                CORS_ORIGIN: "https://atelie.example.com/path"
            }),
        (error: Error) =>
            error.message.includes("ABACATEPAY_RETURN_URL: deve usar HTTPS") &&
            error.message.includes("ABACATEPAY_COMPLETION_URL: nao pode apontar para host local") &&
            error.message.includes("PAYMENT_LINK_PUBLIC_BASE_URL: nao pode apontar para sandbox") &&
            error.message.includes("FRONTEND_URL: deve usar HTTPS") &&
            error.message.includes("CORS_ORIGIN: deve conter somente origens")
    );
});

test("production requires frontend-facing URLs to use configured frontend domain", () => {
    assert.throws(
        () =>
            validateEnv({
                ...validEnvironment,
                ABACATEPAY_COMPLETION_URL: "https://wrong.example.com/success",
                CORS_ORIGIN: "https://admin.atelie.example.com"
            }),
        (error: Error) =>
            error.message.includes(
                "ABACATEPAY_COMPLETION_URL: deve usar o mesmo dominio de FRONTEND_URL"
            ) && error.message.includes("CORS_ORIGIN: deve incluir o dominio de FRONTEND_URL")
    );
});

test("checkout flag is strict and preserves the enabled default outside production", () => {
    assert.throws(
        () => validateEnv({ ...validEnvironment, CHECKOUT_ENABLED: "1" }),
        /CHECKOUT_ENABLED/
    );

    const environment = validateEnv({ NODE_ENV: "test" });
    assert.equal(environment.CHECKOUT_ENABLED, "true");
    assert.equal(environment.SUPERFRETE_BASE_URL, "https://sandbox.superfrete.com/api/v0");
    assert.equal(environment.SUPERFRETE_EXPECTED_ENVIRONMENT, "sandbox");
    assert.equal(environment.ABACATEPAY_EXPECTED_DEV_MODE, "true");
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
                SUPERFRETE_TIMEOUT_MS: "zero",
                FULFILLMENT_WORKER_MAX_ATTEMPTS: "0"
            }),
        (error: Error) =>
            error.message.includes("PORT") &&
            error.message.includes("CORS_ORIGIN") &&
            error.message.includes("SUPERFRETE_TIMEOUT_MS") &&
            error.message.includes("FULFILLMENT_WORKER_MAX_ATTEMPTS")
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
