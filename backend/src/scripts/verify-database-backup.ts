import "dotenv/config";
import { spawn } from "node:child_process";
import { createHash, randomUUID } from "node:crypto";
import { chmod, mkdtemp, readFile, readdir, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { performance } from "node:perf_hooks";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "../generated/prisma/client";
import {
    assertRestoredTargetIdentity,
    assertSafeRestoreSource,
    CriticalUniqueIndex,
    isSafeRestoreTarget,
    parsePostgresDatabaseUrl,
    postgresCliUrlEnvironment,
    RESTORE_VERIFY_TARGET_PREFIX,
    validateCriticalUniqueIndexes
} from "./database-backup-safety";

const ESSENTIAL_TABLES = [
    "Order",
    "OrderPayment",
    "PaymentWebhookEvent",
    "FulfillmentJob",
    "OrderShipment"
] as const;
interface QueryClient {
    $queryRawUnsafe<T>(query: string): Promise<T>;
}

function required(name: string) {
    const value = process.env[name]?.trim();
    if (!value) throw new Error(`${name} obrigatoria`);
    return value;
}

function pgEnvironment(url: URL, databaseName: string): NodeJS.ProcessEnv {
    const environment: NodeJS.ProcessEnv = {
        PATH: process.env.PATH,
        LANG: process.env.LANG,
        LC_ALL: process.env.LC_ALL,
        PGHOST: url.hostname,
        PGPORT: url.port || "5432",
        PGUSER: decodeURIComponent(url.username),
        PGPASSWORD: decodeURIComponent(url.password),
        PGDATABASE: databaseName,
        ...postgresCliUrlEnvironment(url)
    };
    return environment;
}

function targetConnectionString(source: URL, databaseName: string) {
    const target = new URL(source.toString());
    target.pathname = `/${databaseName}`;
    return target.toString();
}

async function runTool(command: string, args: string[], environment: NodeJS.ProcessEnv) {
    const startedAt = performance.now();
    await new Promise<void>((resolve, reject) => {
        const child = spawn(command, args, {
            env: environment,
            stdio: ["ignore", "ignore", "ignore"]
        });
        child.once("error", () => reject(new Error(`${command} nao pode ser executado`)));
        child.once("exit", (code, signal) => {
            if (code === 0) resolve();
            else
                reject(
                    new Error(
                        `${command} falhou (exit=${code ?? "null"}, signal=${signal ?? "none"})`
                    )
                );
        });
    });
    return Math.round(performance.now() - startedAt);
}

function prismaClient(connectionString: string) {
    return new PrismaClient({ adapter: new PrismaPg({ connectionString }) });
}

async function tableCounts(client: QueryClient) {
    const counts: Record<string, number> = {};
    for (const table of ESSENTIAL_TABLES) {
        const result = await client.$queryRawUnsafe<{ count: number }[]>(
            `SELECT count(*)::int AS count FROM "${table}"`
        );
        counts[table] = result[0]?.count ?? 0;
    }
    return counts;
}

async function localMigrations() {
    const migrationsRoot = join(process.cwd(), "prisma", "migrations");
    const entries = await readdir(migrationsRoot, { withFileTypes: true });
    const migrations = await Promise.all(
        entries
            .filter((entry) => entry.isDirectory())
            .map(async (entry) => {
                const contents = await readFile(join(migrationsRoot, entry.name, "migration.sql"));
                return {
                    name: entry.name,
                    checksum: createHash("sha256").update(contents).digest("hex")
                };
            })
    );
    return migrations.sort((left, right) => left.name.localeCompare(right.name));
}

async function validateRestoredDatabase(
    client: QueryClient,
    expectedCounts: Record<string, number>
) {
    const expectedMigrations = await localMigrations();
    const migrations = await client.$queryRawUnsafe<
        {
            migration_name: string;
            checksum: string;
            finished_at: Date | null;
            rolled_back_at: Date | null;
        }[]
    >(
        `SELECT migration_name, checksum, finished_at, rolled_back_at
         FROM "_prisma_migrations"
         ORDER BY migration_name`
    );
    const actualMigrations = migrations.map((migration) => ({
        name: migration.migration_name,
        checksum: migration.checksum
    }));
    if (
        migrations.some(
            (migration) => migration.finished_at === null || migration.rolled_back_at !== null
        ) ||
        JSON.stringify(actualMigrations) !== JSON.stringify(expectedMigrations)
    ) {
        throw new Error("Historico restaurado de migrations diverge dos arquivos versionados");
    }

    const indexes = await client.$queryRawUnsafe<
        {
            index_name: string;
            table_name: string;
            columns: string[];
            is_partial: boolean;
            has_expressions: boolean;
            nulls_not_distinct: boolean;
        }[]
    >(
        `SELECT index_class.relname AS index_name,
                table_class.relname AS table_name,
                COALESCE(
                    array_agg(attribute.attname ORDER BY key.ordinality)
                        FILTER (WHERE key.ordinality <= index_definition.indnkeyatts),
                    ARRAY[]::name[]
                )::text[] AS columns,
                index_definition.indpred IS NOT NULL AS is_partial,
                index_definition.indexprs IS NOT NULL AS has_expressions,
                index_definition.indnullsnotdistinct AS nulls_not_distinct
         FROM pg_index index_definition
         JOIN pg_class index_class ON index_class.oid = index_definition.indexrelid
         JOIN pg_class table_class ON table_class.oid = index_definition.indrelid
         JOIN pg_namespace namespace ON namespace.oid = table_class.relnamespace
         LEFT JOIN LATERAL unnest(index_definition.indkey) WITH ORDINALITY
             AS key(attribute_number, ordinality) ON true
         LEFT JOIN pg_attribute attribute
             ON attribute.attrelid = table_class.oid
            AND attribute.attnum = key.attribute_number
         WHERE namespace.nspname = 'public'
           AND index_definition.indisunique
           AND index_definition.indisvalid
           AND index_definition.indisready
         GROUP BY index_class.relname, table_class.relname, index_definition.indpred,
                  index_definition.indexprs, index_definition.indnullsnotdistinct
         ORDER BY index_class.relname`
    );
    const uniqueIndexCount = validateCriticalUniqueIndexes(
        indexes.map<CriticalUniqueIndex>((index) => ({
            indexName: index.index_name,
            tableName: index.table_name,
            columns: index.columns,
            isPartial: index.is_partial,
            hasExpressions: index.has_expressions,
            nullsNotDistinct: index.nulls_not_distinct
        }))
    );

    const restoredCounts = await tableCounts(client);
    if (JSON.stringify(restoredCounts) !== JSON.stringify(expectedCounts)) {
        throw new Error("Contagens essenciais do restore divergem do snapshot");
    }
    return { migrationCount: actualMigrations.length, uniqueIndexCount };
}

function safeFailureSummary(error: unknown) {
    const message = error instanceof Error ? error.message : "Falha desconhecida";
    const safePatterns = [
        /^DATABASE_URL /,
        /^Restore verification /,
        /^CHECKOUT_DB_RESTORE_VERIFY_/,
        /^Banco fonte /,
        /^Banco conectado /,
        /^Banco restaurado /,
        /^PostgreSQL /,
        /^Nome seguro /,
        /^Historico restaurado /,
        /^Constraints unicas /,
        /^Contagens essenciais /,
        /^(pg_dump|pg_restore|createdb|dropdb) /
    ];
    return safePatterns.some((pattern) => pattern.test(message))
        ? message
        : "Falha interna omitida para evitar vazamento de configuracao";
}

async function main() {
    const connectionString = required("DATABASE_URL");
    const { url: sourceUrl, sourceIdentity } = parsePostgresDatabaseUrl(connectionString);
    const sourceDatabase = sourceIdentity.databaseName;
    assertSafeRestoreSource(sourceIdentity);

    const targetDatabase = `${RESTORE_VERIFY_TARGET_PREFIX}${randomUUID().replaceAll("-", "")}`;
    if (!isSafeRestoreTarget(targetDatabase) || targetDatabase === sourceDatabase) {
        throw new Error("Nome seguro do banco temporario nao pode ser garantido");
    }

    const sourceEnvironment = pgEnvironment(sourceUrl, sourceDatabase);
    const targetEnvironment = pgEnvironment(sourceUrl, targetDatabase);
    const durationsMs: Record<string, number> = {};
    let targetCreationAttempted = false;
    let cleanupTarget = false;
    let cleanupFiles = false;
    let currentStage = "preflight";
    let primaryFailure: { stage: string; summary: string } | undefined;
    const cleanupFailures: { stage: string; summary: string }[] = [];
    let validation: { migrationCount: number; uniqueIndexCount: number } | undefined;
    let expectedCounts: Record<string, number> = {};
    let tempDirectory: string | undefined;
    let backupFile: string | undefined;

    try {
        currentStage = "prepare-temporary-files";
        tempDirectory = await mkdtemp(join(tmpdir(), "checkout-db-restore-"));
        await chmod(tempDirectory, 0o700);
        backupFile = join(tempDirectory, "database.dump");

        currentStage = "source-snapshot";
        const sourceClient = prismaClient(connectionString);
        try {
            const identity = await sourceClient.$queryRawUnsafe<{ database_name: string }[]>(
                "SELECT current_database() AS database_name"
            );
            if (identity[0]?.database_name !== sourceDatabase) {
                throw new Error("Banco conectado diverge de DATABASE_URL");
            }
            await sourceClient.$transaction(
                async (transaction) => {
                    await transaction.$executeRawUnsafe(
                        "SET TRANSACTION ISOLATION LEVEL REPEATABLE READ, READ ONLY"
                    );
                    const snapshotResult = await transaction.$queryRawUnsafe<
                        { snapshot_id: string }[]
                    >("SELECT pg_export_snapshot() AS snapshot_id");
                    const snapshotId = snapshotResult[0]?.snapshot_id;
                    if (!snapshotId) throw new Error("PostgreSQL nao exportou snapshot");
                    expectedCounts = await tableCounts(transaction);
                    durationsMs.backup = await runTool(
                        "pg_dump",
                        [
                            "--format=custom",
                            "--no-owner",
                            "--no-acl",
                            `--snapshot=${snapshotId}`,
                            `--file=${backupFile}`
                        ],
                        sourceEnvironment
                    );
                },
                { maxWait: 10_000, timeout: 300_000 }
            );
        } finally {
            await sourceClient.$disconnect();
        }

        currentStage = "archive-verification";
        durationsMs.archiveVerification = await runTool(
            "pg_restore",
            ["--list", backupFile],
            sourceEnvironment
        );
        currentStage = "create-target";
        targetCreationAttempted = true;
        durationsMs.createDatabase = await runTool(
            "createdb",
            ["--maintenance-db", sourceDatabase, "--template", "template0", targetDatabase],
            sourceEnvironment
        );
        currentStage = "restore-target";
        durationsMs.restore = await runTool(
            "pg_restore",
            ["--exit-on-error", "--no-owner", "--no-acl", "--dbname", targetDatabase, backupFile],
            targetEnvironment
        );

        const targetClient = prismaClient(targetConnectionString(sourceUrl, targetDatabase));
        const validationStartedAt = performance.now();
        currentStage = "validate-target";
        try {
            const targetIdentity = await targetClient.$queryRawUnsafe<{ database_name: string }[]>(
                "SELECT current_database() AS database_name"
            );
            assertRestoredTargetIdentity(targetIdentity[0]?.database_name ?? "", targetDatabase);
            validation = await validateRestoredDatabase(targetClient, expectedCounts);
        } finally {
            await targetClient.$disconnect();
        }
        durationsMs.validation = Math.round(performance.now() - validationStartedAt);
    } catch (error) {
        primaryFailure = { stage: currentStage, summary: safeFailureSummary(error) };
    } finally {
        if (targetCreationAttempted && isSafeRestoreTarget(targetDatabase)) {
            try {
                durationsMs.dropDatabase = await runTool(
                    "dropdb",
                    ["--maintenance-db", sourceDatabase, "--force", "--if-exists", targetDatabase],
                    sourceEnvironment
                );
                cleanupTarget = true;
            } catch (error) {
                cleanupFailures.push({
                    stage: "drop-temporary-database",
                    summary: safeFailureSummary(error)
                });
            }
        }
        if (tempDirectory) {
            try {
                await rm(tempDirectory, { recursive: true, force: true });
                cleanupFiles = true;
            } catch (error) {
                cleanupFailures.push({
                    stage: "remove-temporary-files",
                    summary: safeFailureSummary(error)
                });
            }
        } else {
            cleanupFiles = true;
        }
    }

    if (primaryFailure || cleanupFailures.length > 0 || !cleanupTarget || !cleanupFiles) {
        throw new Error(
            JSON.stringify({
                result: "failed",
                primaryFailure: primaryFailure ?? null,
                cleanupFailures,
                cleanup: {
                    targetCreationAttempted,
                    temporaryDatabaseDropConfirmed: cleanupTarget,
                    temporaryFilesRemoved: cleanupFiles,
                    potentialOrphan: targetCreationAttempted && !cleanupTarget
                }
            })
        );
    }
    if (!validation) {
        throw new Error("Restore passou, mas validacao final nao foi confirmada");
    }
    process.stdout.write(
        `${JSON.stringify(
            {
                result: "passed",
                sourceClassification: "test",
                targetNamePattern: `${RESTORE_VERIFY_TARGET_PREFIX}<random>`,
                backupFormat: "custom",
                snapshotConsistent: true,
                migrationCount: validation.migrationCount,
                criticalUniqueIndexCount: validation.uniqueIndexCount,
                essentialTableCounts: expectedCounts,
                durationsMs,
                cleanup: {
                    targetCreationAttempted,
                    temporaryDatabaseDropConfirmed: cleanupTarget,
                    temporaryFilesRemoved: cleanupFiles
                }
            },
            null,
            2
        )}\n`
    );
}

void main().catch((error: unknown) => {
    process.stderr.write(`${error instanceof Error ? error.message : "Falha desconhecida"}\n`);
    process.exitCode = 1;
});
