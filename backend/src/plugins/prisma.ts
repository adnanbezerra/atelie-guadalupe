import fp from "fastify-plugin";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "../generated/prisma/client";

export default fp(async (fastify) => {
    const connectionString = process.env.DATABASE_URL;
    if (!connectionString) {
        throw new Error("DATABASE_URL nao configurada");
    }

    const adapter = new PrismaPg({
        connectionString
    });
    const prisma = new PrismaClient({
        adapter
    });

    fastify.decorate("prisma", prisma);

    fastify.addHook("onClose", async (instance) => {
        await instance.prisma.$disconnect();
    });
});

declare module "fastify" {
    export interface FastifyInstance {
        prisma: PrismaClient;
    }
}
