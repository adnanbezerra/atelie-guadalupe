import fp from "fastify-plugin";
import { PrismaClient } from "../generated/prisma/client";
import { PaymentExpirationService } from "../modules/payments/services/payment-expiration-service";

export default fp(async (fastify) => {
    let timer: NodeJS.Timeout | undefined;
    let inFlight: Promise<void> | undefined;

    const processDue = () => {
        if (inFlight) return inFlight;
        const prisma = (fastify as typeof fastify & { prisma: PrismaClient }).prisma;
        inFlight = new PaymentExpirationService(prisma)
            .processDue()
            .then(() => undefined)
            .catch((error) => fastify.log.error(error))
            .finally(() => {
                inFlight = undefined;
            });
        return inFlight;
    };

    fastify.addHook("onReady", async () => {
        if (process.env.PAYMENT_EXPIRATION_WORKER_ENABLED === "false") return;
        const intervalMs = Number(process.env.PAYMENT_EXPIRATION_WORKER_INTERVAL_MS ?? 60000);
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
