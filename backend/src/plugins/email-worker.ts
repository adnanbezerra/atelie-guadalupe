import fp from "fastify-plugin";
import { PrismaClient } from "../generated/prisma/client";
import { EmailService, EmailWorkerSummary } from "../modules/emails/email-service";

function redactEmailAddresses(value: string | undefined) {
    return value?.replace(/[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/gi, "[REDACTED_EMAIL]");
}

export default fp(async (fastify) => {
    let timer: NodeJS.Timeout | undefined;
    let service: EmailService | undefined;
    let inFlight: Promise<EmailWorkerSummary | void> | undefined;

    const processDue = () => {
        if (!service) return Promise.resolve();
        if (inFlight) return inFlight;

        inFlight = service
            .processDue(10, (event) => {
                const logData = {
                    emailJob: {
                        ...event,
                        errorMessage: redactEmailAddresses(event.errorMessage)
                    }
                };
                if (event.outcome === "FAILED" || event.outcome === "RETRY_SCHEDULED") {
                    fastify.log.warn(logData, "Envio de email nao concluido");
                    return;
                }
                fastify.log.info(logData, "Job de email processado");
            })
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
            .catch((error) =>
                fastify.log.error({ err: error }, "Falha no ciclo do worker de email")
            )
            .finally(() => {
                inFlight = undefined;
            });
        return inFlight;
    };

    fastify.addHook("onReady", async () => {
        if (process.env.EMAIL_WORKER_ENABLED === "false") {
            fastify.log.warn("Worker de email desabilitado");
            return;
        }
        const prisma = (fastify as typeof fastify & { prisma: PrismaClient }).prisma;
        service = new EmailService(prisma);
        const intervalMs = Number(process.env.EMAIL_WORKER_INTERVAL_MS ?? 15000);
        fastify.log.info({ emailWorker: { intervalMs } }, "Worker de email iniciado");
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
