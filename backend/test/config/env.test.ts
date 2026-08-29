import * as assert from "node:assert";
import { test } from "node:test";
import { validateEnv } from "../../src/config/env";

const validEnvironment: NodeJS.ProcessEnv = {
    NODE_ENV: "production",
    PORT: "3000",
    DATABASE_URL: "postgresql://user:password@database.example.com:5432/app?sslmode=require",
    JWT_SECRET: "1vZ9qL7nY2rT8mK4xP6cD3wF5sH0jB9uE7aN",
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
    EMAIL_REPLY_TO: "suporte@example.com",
    FRONTEND_URL: "https://atelie.example.com",
    FULFILLMENT_WORKER_ENABLED: "true",
    EMAIL_WORKER_ENABLED: "true",
    SHIPPING_TRACKING_WORKER_ENABLED: "true",
    CHECKOUT_ENABLED: "true",
    CHECKOUT_OBSERVABILITY_ENABLED: "true",
    CHECKOUT_ALERT_CHANNEL: "operations-checkout",
    CHECKOUT_ALERT_OWNER: "responsavel-tecnico",
    CHECKOUT_LOG_QUERY_URL: "https://logs.atelieguadalupe.com/checkout",
    CHECKOUT_RUNBOOK_URL: "https://docs.atelieguadalupe.com/checkout-runbook"
};

test("environment validation accepts a complete production configuration", () => {
    const environment = validateEnv(validEnvironment);

    assert.equal(environment.PORT, 3000);
    assert.equal(environment.SUPERFRETE_TIMEOUT_MS, 15000);
    assert.equal(environment.EMAIL_WORKER_ENABLED, "true");
    assert.equal(environment.CHECKOUT_ENABLED, "true");
    assert.equal(environment.FULFILLMENT_WORKER_MAX_ATTEMPTS, 8);
    assert.equal(environment.FULFILLMENT_TRANSACTION_TIMEOUT_MS, 70000);
    assert.equal(environment.ABACATEPAY_EXPECTED_DEV_MODE, "false");
    assert.equal(environment.CHECKOUT_OBSERVABILITY_ENABLED, "true");
});

test("fulfillment transaction timeout covers every provider call plus DB margin", () => {
    assert.throws(
        () =>
            validateEnv({
                ...validEnvironment,
                SUPERFRETE_TIMEOUT_MS: "20000",
                FULFILLMENT_TRANSACTION_TIMEOUT_MS: "89999"
            }),
        (error: Error) =>
            error.message.includes("FULFILLMENT_TRANSACTION_TIMEOUT_MS: deve ser no minimo 90000")
    );

    const environment = validateEnv({
        ...validEnvironment,
        SUPERFRETE_TIMEOUT_MS: "20000",
        FULFILLMENT_TRANSACTION_TIMEOUT_MS: "90000"
    });
    assert.equal(environment.FULFILLMENT_TRANSACTION_TIMEOUT_MS, 90000);
});

test("fulfillment worker lease outlives the financial transaction", () => {
    assert.throws(
        () =>
            validateEnv({
                ...validEnvironment,
                FULFILLMENT_TRANSACTION_TIMEOUT_MS: "70000",
                FULFILLMENT_WORKER_LOCK_TIMEOUT_MS: "79999"
            }),
        (error: Error) =>
            error.message.includes("FULFILLMENT_WORKER_LOCK_TIMEOUT_MS: deve ser no minimo 80000")
    );
});

test("production requires enabled and actionable checkout observability", () => {
    const environment = {
        ...validEnvironment,
        CHECKOUT_OBSERVABILITY_ENABLED: "false",
        CHECKOUT_ALERT_CHANNEL: undefined,
        CHECKOUT_ALERT_OWNER: undefined,
        CHECKOUT_LOG_QUERY_URL: undefined,
        CHECKOUT_RUNBOOK_URL: undefined
    };

    assert.throws(
        () => validateEnv(environment),
        (error: Error) =>
            error.message.includes("CHECKOUT_OBSERVABILITY_ENABLED: deve ser true") &&
            error.message.includes("CHECKOUT_ALERT_CHANNEL: obrigatoria") &&
            error.message.includes("CHECKOUT_ALERT_OWNER: obrigatoria") &&
            error.message.includes("CHECKOUT_LOG_QUERY_URL: obrigatoria") &&
            error.message.includes("CHECKOUT_RUNBOOK_URL: obrigatoria")
    );
});

test("production requires safe real HTTPS observability URLs", () => {
    const unsafeValues = [
        ["CHECKOUT_LOG_QUERY_URL", "http://logs.atelieguadalupe.com/checkout", "HTTPS"],
        ["CHECKOUT_LOG_QUERY_URL", "https://user:secret@logs.atelieguadalupe.com", "credenciais"],
        ["CHECKOUT_RUNBOOK_URL", "https://localhost/runbook", "local ou privado"],
        ["CHECKOUT_RUNBOOK_URL", "https://docs.example.com/runbook", "placeholder"]
    ] as const;

    for (const [name, value, message] of unsafeValues) {
        assert.throws(
            () => validateEnv({ ...validEnvironment, [name]: value }),
            (error: Error) => error.message.includes(`${name}:`) && error.message.includes(message)
        );
    }
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
            error.message.includes("SUPERFRETE_EXPECTED_ENVIRONMENT: obrigatoria em producao") &&
            error.message.includes("CHECKOUT_ENABLED: obrigatoria em producao")
    );
});

test("production requires TLS for PostgreSQL and a strong JWT secret", () => {
    assert.throws(
        () =>
            validateEnv({
                ...validEnvironment,
                DATABASE_URL: "postgresql://user:password@database.example.com:5432/app",
                JWT_SECRET: "change-me"
            }),
        (error: Error) =>
            error.message.includes("DATABASE_URL: deve exigir TLS") &&
            error.message.includes("JWT_SECRET: deve possuir pelo menos 32 bytes")
    );
    assert.throws(
        () =>
            validateEnv({
                ...validEnvironment,
                JWT_SECRET: "aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa"
            }),
        /JWT_SECRET: possui pouca variacao/
    );

    for (const databaseUrl of [
        "mysql://user:password@database.example.com/app?sslmode=require",
        "postgresql://user:password@database.example.com/app?sslmode=require&sslmode=disable",
        "postgresql://user:password@database.example.com/app?sslmode=disable&sslmode=require"
    ]) {
        assert.throws(
            () => validateEnv({ ...validEnvironment, DATABASE_URL: databaseUrl }),
            /DATABASE_URL/
        );
    }
});

test("production requires explicit worker flags and email reply-to", () => {
    const {
        FULFILLMENT_WORKER_ENABLED: _fulfillment,
        EMAIL_WORKER_ENABLED: _email,
        SHIPPING_TRACKING_WORKER_ENABLED: _tracking,
        EMAIL_REPLY_TO: _replyTo,
        ...environment
    } = validEnvironment;

    assert.throws(
        () => validateEnv(environment),
        (error: Error) =>
            error.message.includes("FULFILLMENT_WORKER_ENABLED: obrigatoria") &&
            error.message.includes("EMAIL_WORKER_ENABLED: obrigatoria") &&
            error.message.includes("SHIPPING_TRACKING_WORKER_ENABLED: obrigatoria") &&
            error.message.includes("EMAIL_REPLY_TO: obrigatoria")
    );
});

test("production validates sender email without changing development defaults", () => {
    assert.throws(
        () => validateEnv({ ...validEnvironment, EMAIL_FROM: "invalid sender" }),
        /EMAIL_FROM: deve conter remetente de email valido/
    );

    const environment = validateEnv({ NODE_ENV: "test" });
    assert.equal(environment.FULFILLMENT_WORKER_ENABLED, "true");
    assert.equal(environment.EMAIL_WORKER_ENABLED, "true");
    assert.equal(environment.SHIPPING_TRACKING_WORKER_ENABLED, "true");
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
