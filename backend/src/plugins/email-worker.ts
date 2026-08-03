import fp from "fastify-plugin";
import { PrismaClient } from "../generated/prisma/client";
import { EmailService } from "../modules/emails/email-service";

export default fp(async (fastify) => {
    let timer: NodeJS.Timeout | undefined;

    fastify.addHook("onReady", async () => {
        if (process.env.EMAIL_WORKER_ENABLED === "false") return;
        const prisma = (fastify as typeof fastify & { prisma: PrismaClient }).prisma;
        const service = new EmailService(prisma);
        const intervalMs = Number(process.env.EMAIL_WORKER_INTERVAL_MS ?? 15000);
        await service.processDue().catch((error) => fastify.log.error(error));
        timer = setInterval(() => {
            void service.processDue().catch((error) => fastify.log.error(error));
        }, intervalMs);
        timer.unref();
    });

    fastify.addHook("onClose", async () => {
        if (timer) clearInterval(timer);
    });
});
