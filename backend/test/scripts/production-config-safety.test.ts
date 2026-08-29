import * as assert from "node:assert";
import { test } from "node:test";
import {
    inspectProductionDatabasePrivileges,
    inspectProductionEnvironment,
    manualProductionChecks,
    productionPreflightReport
} from "../../src/scripts/production-config-safety";

const validProductionEnvironment: NodeJS.ProcessEnv = {
    NODE_ENV: "production",
    DATABASE_URL: "postgresql://app:secret@database.example.com/app?sslmode=verify-full",
    JWT_SECRET: "1vZ9qL7nY2rT8mK4xP6cD3wF5sH0jB9uE7aN",
    CORS_ORIGIN: "https://atelie.example.com",
    MONGODB_URL: "mongodb://database.example.com/media",
    MONGODB_DB_NAME: "media",
    SUPERFRETE_BASE_URL: "https://api.superfrete.com/api/v0",
    SUPERFRETE_TOKEN: "secret",
    SUPERFRETE_USER_AGENT: "Atelie Guadalupe (tech@example.com)",
    SUPERFRETE_EXPECTED_ENVIRONMENT: "production",
    ABACATEPAY_BASE_URL: "https://api.abacatepay.com/v2",
    ABACATEPAY_API_KEY: "production-key",
    ABACATEPAY_RETURN_URL: "https://atelie.example.com/checkout",
    ABACATEPAY_COMPLETION_URL: "https://atelie.example.com/checkout/success",
    ABACATEPAY_WEBHOOK_SECRET: "webhook-secret",
    ABACATEPAY_EXPECTED_DEV_MODE: "false",
    PAYMENT_LINK_PUBLIC_BASE_URL: "https://atelie.example.com/checkout/manual",
    CHECKOUT_ENABLED: "false",
    CHECKOUT_ROLLOUT_MODE: "ALLOWLIST",
    CHECKOUT_ALLOWED_USER_UUIDS: "0195f4aa-7f18-7db5-9f32-06f4a9a2b401",
    CHECKOUT_OBSERVABILITY_ENABLED: "true",
    CHECKOUT_ALERT_CHANNEL: "operations-checkout",
    CHECKOUT_ALERT_OWNER: "responsavel-tecnico",
    CHECKOUT_LOG_QUERY_URL: "https://logs.atelieguadalupe.com/checkout",
    CHECKOUT_RUNBOOK_URL: "https://docs.atelieguadalupe.com/checkout-runbook",
    FULFILLMENT_WORKER_ENABLED: "true",
    EMAIL_WORKER_ENABLED: "true",
    SHIPPING_TRACKING_WORKER_ENABLED: "true",
    RESEND_API_KEY: "secret",
    EMAIL_FROM: "Atelie Guadalupe <contato@example.com>",
    EMAIL_REPLY_TO: "suporte@example.com",
    FRONTEND_URL: "https://atelie.example.com"
};

test("production preflight accepts only explicit provider modes and disabled checkout", () => {
    const checks = inspectProductionEnvironment(validProductionEnvironment);
    assert.equal(
        checks.every((check) => check.status === "AUTO_PASS"),
        true
    );

    const unsafe = inspectProductionEnvironment({
        ...validProductionEnvironment,
        CHECKOUT_ENABLED: "true",
        SUPERFRETE_BASE_URL: "https://sandbox.superfrete.com/api/v0",
        SUPERFRETE_EXPECTED_ENVIRONMENT: "sandbox",
        ABACATEPAY_EXPECTED_DEV_MODE: "true"
    });
    assert.deepEqual(
        unsafe.filter((check) => check.status === "AUTO_FAIL").map((check) => check.id),
        [
            "production_environment_schema",
            "checkout_disabled_during_preflight",
            "abacatepay_production_mode",
            "superfrete_production_mode"
        ]
    );

    const wrongNodeEnvironment = inspectProductionEnvironment({
        ...validProductionEnvironment,
        NODE_ENV: "development"
    });
    assert.equal(
        wrongNodeEnvironment.find((check) => check.id === "node_environment_is_production")?.status,
        "AUTO_FAIL"
    );

    const publicRollout = inspectProductionEnvironment({
        ...validProductionEnvironment,
        CHECKOUT_ROLLOUT_MODE: "PUBLIC",
        CHECKOUT_ALLOWED_USER_UUIDS: undefined
    });
    assert.equal(
        publicRollout.find((check) => check.id === "checkout_rollout_starts_with_allowlist")
            ?.status,
        "AUTO_FAIL"
    );

    const dedicatedWebReplica = inspectProductionEnvironment({
        ...validProductionEnvironment,
        FULFILLMENT_WORKER_ENABLED: "false",
        EMAIL_WORKER_ENABLED: "false",
        SHIPPING_TRACKING_WORKER_ENABLED: "false"
    });
    assert.equal(
        dedicatedWebReplica.find((check) => check.id === "worker_flags_configured_explicitly")
            ?.status,
        "AUTO_PASS"
    );
});

test("database privilege checks reject ownership, DDL and dangerous role attributes", () => {
    const safeChecks = inspectProductionDatabasePrivileges({
        dangerousRoleAttributes: false,
        ownsCurrentDatabase: false,
        ownsPublicSchema: false,
        ownsApplicationTables: false,
        canCreateInCurrentDatabase: false,
        canCreateInPublicSchema: false,
        canUsePublicSchema: true
    });
    assert.equal(
        safeChecks.every((check) => check.status === "AUTO_PASS"),
        true
    );

    const unsafeChecks = inspectProductionDatabasePrivileges({
        dangerousRoleAttributes: true,
        ownsCurrentDatabase: true,
        ownsPublicSchema: true,
        ownsApplicationTables: true,
        canCreateInCurrentDatabase: true,
        canCreateInPublicSchema: true,
        canUsePublicSchema: false
    });
    assert.equal(
        unsafeChecks.every((check) => check.status === "AUTO_FAIL"),
        true
    );
});

test("report never declares a global pass while manual review remains", () => {
    const automaticChecks = inspectProductionEnvironment(validProductionEnvironment);
    const report = productionPreflightReport(automaticChecks);
    assert.equal(report.overallStatus, "MANUAL_REQUIRED");
    assert.equal(
        manualProductionChecks().every((check) => check.status === "MANUAL_REQUIRED"),
        true
    );
    assert.equal(JSON.stringify(report).includes(validProductionEnvironment.JWT_SECRET!), false);

    const failed = productionPreflightReport([
        { id: "production_environment_schema", status: "AUTO_FAIL" }
    ]);
    assert.equal(failed.overallStatus, "AUTO_FAIL");
});
