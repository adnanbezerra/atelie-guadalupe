import "dotenv/config";
import { PrismaPg } from "@prisma/adapter-pg";
import { Prisma, PrismaClient } from "../generated/prisma/client";
import {
    inspectProductionDatabasePrivileges,
    inspectProductionEnvironment,
    manualProductionChecks,
    ProductionDatabasePrivileges,
    ProductionPreflightCheck,
    productionPreflightReport
} from "./production-config-safety";

async function readDatabasePrivileges(prisma: Prisma.TransactionClient) {
    const rows = await prisma.$queryRaw<
        Array<{
            dangerous_role_attributes: boolean;
            owns_current_database: boolean;
            owns_public_schema: boolean;
            owns_application_tables: boolean;
            can_create_in_current_database: boolean;
            can_create_in_public_schema: boolean;
            can_use_public_schema: boolean;
        }>
    >`
        SELECT
            EXISTS (
                SELECT 1
                FROM pg_roles inherited_role
                WHERE pg_has_role(current_user, inherited_role.oid, 'MEMBER')
                  AND (inherited_role.rolsuper OR inherited_role.rolcreaterole OR
                       inherited_role.rolcreatedb OR inherited_role.rolreplication OR
                       inherited_role.rolbypassrls)
            ) AS dangerous_role_attributes,
            pg_has_role(current_user, database.datdba, 'MEMBER') AS owns_current_database,
            pg_has_role(current_user, namespace.nspowner, 'MEMBER') AS owns_public_schema,
            EXISTS (
                SELECT 1
                FROM pg_class relation
                JOIN pg_namespace relation_namespace
                  ON relation_namespace.oid = relation.relnamespace
                WHERE relation_namespace.nspname = 'public'
                  AND relation.relkind IN ('r', 'p', 'S')
                  AND pg_has_role(current_user, relation.relowner, 'MEMBER')
            ) AS owns_application_tables,
            has_database_privilege(current_user, current_database(), 'CREATE')
                AS can_create_in_current_database,
            has_schema_privilege(current_user, 'public', 'CREATE') AS can_create_in_public_schema,
            has_schema_privilege(current_user, 'public', 'USAGE') AS can_use_public_schema
        FROM pg_database database
        JOIN pg_namespace namespace ON namespace.nspname = 'public'
        WHERE database.datname = current_database()
    `;
    const row = rows[0];
    if (!row) throw new Error("Auditoria de privilegios nao retornou resultado");
    return {
        dangerousRoleAttributes: row.dangerous_role_attributes,
        ownsCurrentDatabase: row.owns_current_database,
        ownsPublicSchema: row.owns_public_schema,
        ownsApplicationTables: row.owns_application_tables,
        canCreateInCurrentDatabase: row.can_create_in_current_database,
        canCreateInPublicSchema: row.can_create_in_public_schema,
        canUsePublicSchema: row.can_use_public_schema
    } satisfies ProductionDatabasePrivileges;
}

async function main() {
    const environmentChecks = inspectProductionEnvironment(process.env);
    let databaseChecks: ProductionPreflightCheck[] = [];
    const environmentFailed = environmentChecks.some((check) => check.status === "AUTO_FAIL");

    if (!environmentFailed) {
        const connectionString = process.env.DATABASE_URL;
        if (!connectionString) {
            databaseChecks = [{ id: "database_privilege_probe", status: "AUTO_FAIL" }];
        } else {
            const prisma = new PrismaClient({ adapter: new PrismaPg({ connectionString }) });
            try {
                databaseChecks = inspectProductionDatabasePrivileges(
                    await prisma.$transaction(async (transaction) => {
                        await transaction.$executeRaw`SET TRANSACTION READ ONLY`;
                        return readDatabasePrivileges(transaction);
                    })
                );
            } catch {
                databaseChecks = [{ id: "database_privilege_probe", status: "AUTO_FAIL" }];
            } finally {
                await prisma.$disconnect().catch(() => undefined);
            }
        }
    }

    const report = productionPreflightReport(
        [...environmentChecks, ...databaseChecks],
        manualProductionChecks()
    );
    process.stdout.write(`${JSON.stringify(report, null, 2)}\n`);
    if (report.overallStatus === "AUTO_FAIL") process.exitCode = 1;
}

void main().catch(() => {
    process.stdout.write(
        `${JSON.stringify({ overallStatus: "AUTO_FAIL", automaticChecks: [{ id: "preflight_execution", status: "AUTO_FAIL" }], manualChecks: manualProductionChecks() }, null, 2)}\n`
    );
    process.exitCode = 1;
});
