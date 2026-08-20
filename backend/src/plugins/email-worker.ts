import fp from "fastify-plugin";
import { PrismaClient } from "../generated/prisma/client";
import { EmailService } from "../modules/emails/email-service";

export default fp(async (fastify) => {
    let timer: NodeJS.Timeout | undefined;
    let service: EmailService | undefined;
    let inFlight: Promise<void> | undefined;

    const processDue = () => {
        if (!service) return Promise.resolve();
        if (inFlight) return inFlight;

        inFlight = service
            .processDue()
            .catch((error) => fastify.log.error(error))
            .finally(() => {
                inFlight = undefined;
            });
        return inFlight;
    };

    fastify.addHook("onReady", async () => {
        if (process.env.EMAIL_WORKER_ENABLED === "false") return;
        const prisma = (fastify as typeof fastify & { prisma: PrismaClient }).prisma;
        service = new EmailService(prisma);
        const intervalMs = Number(process.env.EMAIL_WORKER_INTERVAL_MS ?? 15000);
        await processDue();
        timer = setInterval(() => {
            void processDue();
        }, intervalMs);
        timer.unref();
    });

    fastify.addHook("onClose", async () => {
        if (timer) clearInterval(timer);
        await inFlight;
    });
});
