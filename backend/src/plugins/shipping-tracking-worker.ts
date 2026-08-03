import fp from "fastify-plugin";
import { PrismaClient } from "../generated/prisma/client";
import { ShippingTrackingService } from "../modules/shipping/shipping-tracking-service";

export default fp(async (fastify) => {
    let timer: NodeJS.Timeout | undefined;

    fastify.addHook("onReady", async () => {
        if (process.env.SHIPPING_TRACKING_WORKER_ENABLED === "false") return;
        const prisma = (fastify as typeof fastify & { prisma: PrismaClient }).prisma;
        const service = new ShippingTrackingService(prisma);
        const intervalMs = Number(process.env.SHIPPING_TRACKING_WORKER_INTERVAL_MS ?? 60000);
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
