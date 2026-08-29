import * as assert from "node:assert";
import { test } from "node:test";
import {
    assertRestoredTargetIdentity,
    assertSafeRestoreSource,
    CriticalUniqueIndex,
    isSafeRestoreTarget,
    parsePostgresDatabaseUrl,
    postgresCliUrlEnvironment,
    validateCriticalUniqueIndexes
} from "../../src/scripts/database-backup-safety";

const allowedEnvironment = {
    NODE_ENV: "test",
    CHECKOUT_DB_RESTORE_VERIFY_ALLOW_DATABASE_WRITES: "true",
    CHECKOUT_DB_RESTORE_VERIFY_EXPECTED_SOURCE_DATABASE: "checkout_test",
    CHECKOUT_DB_RESTORE_VERIFY_EXPECTED_SOURCE_HOST: "test-db.internal",
    CHECKOUT_DB_RESTORE_VERIFY_EXPECTED_SOURCE_PORT: "5432"
};
const sourceIdentity = {
    databaseName: "checkout_test",
    host: "test-db.internal",
    port: "5432"
};

test("restore verification accepts only explicitly expected test source", () => {
    assert.doesNotThrow(() => assertSafeRestoreSource(sourceIdentity, allowedEnvironment));
    assert.throws(
        () =>
            assertSafeRestoreSource(
                { ...sourceIdentity, databaseName: "checkout" },
                allowedEnvironment
            ),
        /deve terminar com _test/
    );
    assert.throws(
        () =>
            assertSafeRestoreSource(
                { ...sourceIdentity, databaseName: "other_test" },
                allowedEnvironment
            ),
        /diverge do nome de teste/
    );
});

test("restore verification independently checks source host and effective port", () => {
    assert.throws(
        () =>
            assertSafeRestoreSource(
                { ...sourceIdentity, host: "other-test-db.internal" },
                allowedEnvironment
            ),
        /Host fonte diverge/
    );
    assert.throws(
        () => assertSafeRestoreSource({ ...sourceIdentity, port: "5433" }, allowedEnvironment),
        /Porta fonte diverge/
    );
});

test("restore verification rejects production and missing write opt-in", () => {
    assert.throws(
        () =>
            assertSafeRestoreSource(sourceIdentity, {
                ...allowedEnvironment,
                NODE_ENV: "production"
            }),
        /exige NODE_ENV=test/
    );
    assert.throws(
        () =>
            assertSafeRestoreSource(sourceIdentity, {
                ...allowedEnvironment,
                NODE_ENV: "development"
            }),
        /exige NODE_ENV=test/
    );
    assert.throws(
        () =>
            assertSafeRestoreSource(sourceIdentity, {
                ...allowedEnvironment,
                CHECKOUT_DB_RESTORE_VERIFY_ALLOW_DATABASE_WRITES: undefined
            }),
        /ALLOW_DATABASE_WRITES obrigatoria/
    );
    assert.throws(
        () =>
            assertSafeRestoreSource(sourceIdentity, {
                ...allowedEnvironment,
                CHECKOUT_DB_RESTORE_VERIFY_ALLOW_DATABASE_WRITES: "false"
            }),
        /ALLOW_DATABASE_WRITES deve ser true/
    );
});

test("database URL parser accepts PostgreSQL and rejects unsafe database paths", () => {
    const parsed = parsePostgresDatabaseUrl("postgresql://user@db.example/checkout_test");
    assert.deepEqual(parsed.sourceIdentity, {
        databaseName: "checkout_test",
        host: "db.example",
        port: "5432"
    });
    assert.throws(() => parsePostgresDatabaseUrl("mysql://db.example/checkout_test"), /PostgreSQL/);
    assert.throws(() => parsePostgresDatabaseUrl("postgresql://db.example"), /um unico banco/);
    assert.throws(
        () => parsePostgresDatabaseUrl("postgresql://db.example/checkout%2Ftest"),
        /um unico banco/
    );
});

test("CLI connection environment propagates libpq options and rejects unknown parameters", () => {
    const environment = postgresCliUrlEnvironment(
        new URL(
            "postgresql://db.example/checkout_test?sslmode=verify-full&sslrootcert=%2Fsecure%2Fca.pem&connect_timeout=10&schema=public"
        )
    );
    assert.deepEqual(environment, {
        PGSSLMODE: "verify-full",
        PGSSLROOTCERT: "/secure/ca.pem",
        PGCONNECT_TIMEOUT: "10"
    });
    assert.throws(
        () =>
            postgresCliUrlEnvironment(
                new URL("postgresql://db.example/checkout_test?unknown_option=value")
            ),
        /Parametro de conexao PostgreSQL nao suportado/
    );
});

const validIndexes: CriticalUniqueIndex[] = [
    {
        indexName: "Order_uuid_key",
        tableName: "Order",
        columns: ["uuid"],
        isPartial: false,
        hasExpressions: false,
        nullsNotDistinct: false
    },
    {
        indexName: "Order_paymentIdempotencyKey_key",
        tableName: "Order",
        columns: ["paymentIdempotencyKey"],
        isPartial: false,
        hasExpressions: false,
        nullsNotDistinct: false
    },
    {
        indexName: "OrderPayment_orderId_key",
        tableName: "OrderPayment",
        columns: ["orderId"],
        isPartial: false,
        hasExpressions: false,
        nullsNotDistinct: false
    },
    {
        indexName: "OrderPayment_idempotencyKey_key",
        tableName: "OrderPayment",
        columns: ["idempotencyKey"],
        isPartial: false,
        hasExpressions: false,
        nullsNotDistinct: false
    },
    {
        indexName: "OrderPayment_providerCheckoutId_key",
        tableName: "OrderPayment",
        columns: ["providerCheckoutId"],
        isPartial: false,
        hasExpressions: false,
        nullsNotDistinct: false
    },
    {
        indexName: "PaymentWebhookEvent_eventId_key",
        tableName: "PaymentWebhookEvent",
        columns: ["eventId"],
        isPartial: false,
        hasExpressions: false,
        nullsNotDistinct: false
    }
];

test("critical unique indexes require exact table and ordered plain columns", () => {
    assert.equal(validateCriticalUniqueIndexes(validIndexes), 6);
    for (const invalid of [
        { ...validIndexes[0], tableName: "OrderPayment" },
        { ...validIndexes[0], columns: ["paymentIdempotencyKey", "uuid"] },
        { ...validIndexes[0], isPartial: true },
        { ...validIndexes[0], hasExpressions: true },
        { ...validIndexes[0], nullsNotDistinct: true }
    ]) {
        assert.throws(
            () => validateCriticalUniqueIndexes([invalid, ...validIndexes.slice(1)]),
            /Constraints unicas criticas/
        );
    }
});

test("temporary restore target requires exact rigid prefix and random suffix", () => {
    assert.equal(
        isSafeRestoreTarget("checkout_restore_verify_0123456789abcdef0123456789abcdef"),
        true
    );
    assert.equal(isSafeRestoreTarget("checkout_test"), false);
    assert.equal(isSafeRestoreTarget("checkout_restore_verify_short"), false);
    assert.equal(
        isSafeRestoreTarget("checkout_restore_verify_0123456789abcdef0123456789abcdef_extra"),
        false
    );
});

test("restored target identity must exactly match generated safe database", () => {
    const expected = "checkout_restore_verify_0123456789abcdef0123456789abcdef";
    assert.doesNotThrow(() => assertRestoredTargetIdentity(expected, expected));
    assert.throws(
        () => assertRestoredTargetIdentity("checkout_restore_verify_other", expected),
        /Banco restaurado diverge/
    );
    assert.throws(
        () => assertRestoredTargetIdentity("checkout_test", "checkout_test"),
        /Banco restaurado diverge/
    );
});
