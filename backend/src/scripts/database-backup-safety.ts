export const RESTORE_VERIFY_TARGET_PREFIX = "checkout_restore_verify_";
const RESTORE_VERIFY_TARGET_PATTERN = /^checkout_restore_verify_[0-9a-f]{32}$/;
const LIBPQ_URL_PARAMETERS: Record<string, string> = {
    application_name: "PGAPPNAME",
    channel_binding: "PGCHANNELBINDING",
    connect_timeout: "PGCONNECT_TIMEOUT",
    options: "PGOPTIONS",
    sslcert: "PGSSLCERT",
    sslcrl: "PGSSLCRL",
    sslkey: "PGSSLKEY",
    sslmode: "PGSSLMODE",
    sslrootcert: "PGSSLROOTCERT",
    target_session_attrs: "PGTARGETSESSIONATTRS"
};
const PRISMA_ONLY_URL_PARAMETERS = new Set(["connection_limit", "pool_timeout", "schema"]);

export interface CriticalUniqueIndex {
    indexName: string;
    tableName: string;
    columns: string[];
    isPartial: boolean;
    hasExpressions: boolean;
    nullsNotDistinct: boolean;
}

export interface RestoreSourceIdentity {
    databaseName: string;
    host: string;
    port: string;
}

const EXPECTED_CRITICAL_UNIQUE_INDEXES: Omit<
    CriticalUniqueIndex,
    "isPartial" | "hasExpressions" | "nullsNotDistinct"
>[] = [
    { indexName: "Order_uuid_key", tableName: "Order", columns: ["uuid"] },
    {
        indexName: "Order_paymentIdempotencyKey_key",
        tableName: "Order",
        columns: ["paymentIdempotencyKey"]
    },
    { indexName: "OrderPayment_orderId_key", tableName: "OrderPayment", columns: ["orderId"] },
    {
        indexName: "OrderPayment_idempotencyKey_key",
        tableName: "OrderPayment",
        columns: ["idempotencyKey"]
    },
    {
        indexName: "OrderPayment_providerCheckoutId_key",
        tableName: "OrderPayment",
        columns: ["providerCheckoutId"]
    },
    {
        indexName: "PaymentWebhookEvent_eventId_key",
        tableName: "PaymentWebhookEvent",
        columns: ["eventId"]
    }
];

function required(environment: NodeJS.ProcessEnv, name: string) {
    const value = environment[name]?.trim();
    if (!value) throw new Error(`${name} obrigatoria`);
    return value;
}

export function assertSafeRestoreSource(
    source: RestoreSourceIdentity,
    environment: NodeJS.ProcessEnv = process.env
) {
    if (environment.NODE_ENV !== "test") {
        throw new Error("Restore verification exige NODE_ENV=test");
    }
    if (required(environment, "CHECKOUT_DB_RESTORE_VERIFY_ALLOW_DATABASE_WRITES") !== "true") {
        throw new Error("CHECKOUT_DB_RESTORE_VERIFY_ALLOW_DATABASE_WRITES deve ser true");
    }
    if (!source.databaseName.endsWith("_test")) {
        throw new Error("Banco fonte deve terminar com _test");
    }
    if (
        required(environment, "CHECKOUT_DB_RESTORE_VERIFY_EXPECTED_SOURCE_DATABASE") !==
        source.databaseName
    ) {
        throw new Error("Banco fonte diverge do nome de teste explicitamente esperado");
    }
    if (required(environment, "CHECKOUT_DB_RESTORE_VERIFY_EXPECTED_SOURCE_HOST") !== source.host) {
        throw new Error("Host fonte diverge do host de teste explicitamente esperado");
    }
    if (required(environment, "CHECKOUT_DB_RESTORE_VERIFY_EXPECTED_SOURCE_PORT") !== source.port) {
        throw new Error("Porta fonte diverge da porta de teste explicitamente esperada");
    }
}

export function parsePostgresDatabaseUrl(connectionString: string) {
    const url = new URL(connectionString);
    if (url.protocol !== "postgresql:" && url.protocol !== "postgres:") {
        throw new Error("DATABASE_URL deve usar PostgreSQL");
    }
    const databaseName = decodeURIComponent(url.pathname.slice(1));
    if (!databaseName || databaseName.includes("/")) {
        throw new Error("DATABASE_URL deve identificar um unico banco");
    }
    return {
        url,
        sourceIdentity: {
            databaseName,
            host: url.hostname,
            port: url.port || "5432"
        }
    };
}

export function isSafeRestoreTarget(databaseName: string) {
    return RESTORE_VERIFY_TARGET_PATTERN.test(databaseName);
}

export function assertRestoredTargetIdentity(actualDatabase: string, expectedDatabase: string) {
    if (!isSafeRestoreTarget(expectedDatabase) || actualDatabase !== expectedDatabase) {
        throw new Error("Banco restaurado diverge do alvo temporario esperado");
    }
}

export function postgresCliUrlEnvironment(url: URL) {
    const environment: NodeJS.ProcessEnv = {};
    for (const [name, value] of url.searchParams) {
        const environmentName = LIBPQ_URL_PARAMETERS[name];
        if (environmentName) environment[environmentName] = value;
        else if (!PRISMA_ONLY_URL_PARAMETERS.has(name)) {
            throw new Error("Parametro de conexao PostgreSQL nao suportado pelas ferramentas CLI");
        }
    }
    return environment;
}

export function validateCriticalUniqueIndexes(indexes: CriticalUniqueIndex[]) {
    for (const expected of EXPECTED_CRITICAL_UNIQUE_INDEXES) {
        const actual = indexes.find((index) => index.indexName === expected.indexName);
        if (
            !actual ||
            actual.tableName !== expected.tableName ||
            JSON.stringify(actual.columns) !== JSON.stringify(expected.columns) ||
            actual.isPartial ||
            actual.hasExpressions ||
            actual.nullsNotDistinct
        ) {
            throw new Error("Constraints unicas criticas ausentes ou invalidas no restore");
        }
    }
    return EXPECTED_CRITICAL_UNIQUE_INDEXES.length;
}
