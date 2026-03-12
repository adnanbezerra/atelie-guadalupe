import "dotenv/config";
import * as bcrypt from "bcrypt";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "../src/generated/prisma/client";
import { RoleName } from "../src/generated/prisma/enums";
import { createUuid } from "../src/core/utils/uuid";

async function main() {
    const connectionString = process.env.DATABASE_URL;
    if (!connectionString) {
        throw new Error("DATABASE_URL nao configurada");
    }

    const adminEmail = process.env.SEED_ADMIN_EMAIL;
    const adminPassword = process.env.SEED_ADMIN_PASSWORD;
    const adminDocument = process.env.SEED_ADMIN_DOCUMENT ?? "00000000000";
    const adminName = process.env.SEED_ADMIN_NAME ?? "Admin Inicial";

    const adapter = new PrismaPg({
        connectionString
    });
    const prisma = new PrismaClient({
        adapter
    });

    try {
        for (const role of [RoleName.ADMIN, RoleName.SUBADMIN, RoleName.USER]) {
            await prisma.role.upsert({
                where: {
                    name: role
                },
                update: {},
                create: {
                    name: role
                }
            });
        }

        if (adminEmail && adminPassword) {
            const adminRole = await prisma.role.findUniqueOrThrow({
                where: {
                    name: RoleName.ADMIN
                }
            });

            const passwordHash = await bcrypt.hash(adminPassword, 12);

            await prisma.user.upsert({
                where: {
                    email: adminEmail.trim().toLowerCase()
                },
                update: {
                    name: adminName,
                    document: adminDocument.replace(/\D/g, ""),
                    passwordHash,
                    roleId: adminRole.id,
                    isActive: true
                },
                create: {
                    uuid: createUuid(),
                    name: adminName,
                    email: adminEmail.trim().toLowerCase(),
                    document: adminDocument.replace(/\D/g, ""),
                    passwordHash,
                    isActive: true,
                    roleId: adminRole.id
                }
            });
        }
    } finally {
        await prisma.$disconnect();
    }
}

main().catch((error) => {
    console.error(error);
    process.exit(1);
});
