import fp from "fastify-plugin";
import { PrismaClient } from "../generated/prisma/client";
import { EmailService, EmailWorkerSummary } from "../modules/emails/email-service";

export default fp(async (fastify) => {
    let timer: NodeJS.Timeout | undefined;
    let service: EmailService | undefined;
    let inFlight: Promise<EmailWorkerSummary | void> | undefined;

    const processDue = () => {
        if (!service) return Promise.resolve();
        if (inFlight) return inFlight;

        inFlight = service
            .processDue()
            .then((summary) => {
                if (summary.staleCancelled > 0 || summary.selected > 0) {
                    const log =
                        summary.failed > 0 || summary.retryScheduled > 0
                            ? fastify.log.warn.bind(fastify.log)
                            : fastify.log.info.bind(fastify.log);
                    log({ emailWorker: summary }, "Ciclo do worker de email concluido");
                }
                return summary;
            })
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
        void processDue();
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
