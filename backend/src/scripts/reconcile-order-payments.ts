import "dotenv/config";
import { readFile } from "node:fs/promises";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "../generated/prisma/client";
import { AbacatePayClient } from "../modules/payments/services/abacatepay-client";
import {
    FinancialReconciliationService,
    PrismaFinancialReconciliationSource,
    ResolutionRegistry
} from "../modules/payments/services/financial-reconciliation-service";

function required(name: string) {
    const value = process.env[name]?.trim();
    if (!value) throw new Error(`${name} obrigatoria`);
    return value;
}

function instant(name: string) {
    const value = new Date(required(name));
    if (!Number.isFinite(value.getTime())) throw new Error(`${name} deve ser ISO 8601 valido`);
    return value;
}

async function loadResolutions(): Promise<ResolutionRegistry> {
    const path = process.env.FINANCIAL_RECONCILIATION_RESOLUTIONS_FILE?.trim();
    if (!path) return {};
    const parsed = JSON.parse(await readFile(path, "utf8")) as unknown;
    if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) {
        throw new Error("Arquivo de resolucoes deve conter objeto JSON");
    }
    return parsed as ResolutionRegistry;
}

async function main() {
    const connectionString = required("DATABASE_URL");
    const prisma = new PrismaClient({ adapter: new PrismaPg({ connectionString }) });
    try {
        const service = new FinancialReconciliationService(
            new PrismaFinancialReconciliationSource(prisma),
            AbacatePayClient.fromEnv(),
            {
                owner: required("FINANCIAL_RECONCILIATION_OWNER"),
                periodFrom: instant("FINANCIAL_RECONCILIATION_FROM"),
                periodTo: instant("FINANCIAL_RECONCILIATION_TO"),
                resolutions: await loadResolutions()
            }
        );
        process.stdout.write(`${JSON.stringify(await service.run(), null, 2)}\n`);
    } finally {
        await prisma.$disconnect();
    }
}

void main().catch((error: unknown) => {
    process.stderr.write(`${error instanceof Error ? error.message : "Falha desconhecida"}\n`);
    process.exitCode = 1;
});
