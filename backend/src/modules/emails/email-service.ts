import { PrismaClient } from "../../generated/prisma/client";
import { EmailDeliveryStatus, EmailJobStatus, EmailJobType } from "../../generated/prisma/enums";
import { createUuid } from "../../core/utils/uuid";
import { renderEmail } from "./email-templates";
import { EmailProvider, EmailProviderError, ResendEmailProvider } from "./resend-email-provider";

const MAX_ATTEMPTS = 4;
const RETRY_DELAYS_MS = [30_000, 120_000, 600_000];
const PASSWORD_RESET_MAX_AGE_MS = 10 * 60 * 1000;
const TRANSACTIONAL_EMAIL_MAX_AGE_MS = 24 * 60 * 60 * 1000;

export type EmailWorkerSummary = {
    selected: number;
    sent: number;
    retryScheduled: number;
    failed: number;
    skipped: number;
    staleCancelled: number;
};

type ProcessJobResult = "SENT" | "RETRY_SCHEDULED" | "FAILED" | "SKIPPED";

function errorDetails(error: unknown) {
    if (error instanceof EmailProviderError) {
        return { code: error.code.slice(0, 100), message: error.message.slice(0, 500) };
    }
    return {
        code: "UNKNOWN_ERROR",
        message: error instanceof Error ? error.message.slice(0, 500) : "Falha desconhecida"
    };
}

export class EmailService {
    public constructor(
        private readonly prisma: PrismaClient,
        private readonly provider: EmailProvider = new ResendEmailProvider()
    ) {}

    public async processDue(limit = 10) {
        const now = new Date();
        const staleBefore = new Date(
            now.getTime() - Number(process.env.EMAIL_WORKER_LOCK_TIMEOUT_MS ?? 300000)
        );
        await this.prisma.emailJob.updateMany({
            where: {
                status: EmailJobStatus.PROCESSING,
                attempts: { gte: MAX_ATTEMPTS },
                lockedAt: { lt: staleBefore }
            },
            data: {
                status: EmailJobStatus.FAILED,
                lockedAt: null,
                lastError: "Ultima tentativa interrompida; resultado desconhecido"
            }
        });
        await this.prisma.emailJob.updateMany({
            where: {
                status: EmailJobStatus.PROCESSING,
                attempts: { lt: MAX_ATTEMPTS },
                lockedAt: { lt: staleBefore }
            },
            data: {
                status: EmailJobStatus.RETRY_SCHEDULED,
                nextAttemptAt: new Date(),
                lockedAt: null,
                lastError: "Processamento interrompido; tentativa com resultado desconhecido"
            }
        });

        const passwordResetCutoff = new Date(now.getTime() - PASSWORD_RESET_MAX_AGE_MS);
        const transactionalCutoff = new Date(now.getTime() - TRANSACTIONAL_EMAIL_MAX_AGE_MS);
        const expiredPasswordResets = await this.prisma.emailJob.updateMany({
            where: {
                type: EmailJobType.PASSWORD_RESET,
                status: { in: [EmailJobStatus.PENDING, EmailJobStatus.RETRY_SCHEDULED] },
                createdAt: { lt: passwordResetCutoff }
            },
            data: {
                status: EmailJobStatus.CANCELLED,
                payload: {},
                lockedAt: null,
                lastError: "Codigo de recuperacao expirou antes do envio"
            }
        });
        const expiredTransactionalEmails = await this.prisma.emailJob.updateMany({
            where: {
                type: { not: EmailJobType.PASSWORD_RESET },
                status: { in: [EmailJobStatus.PENDING, EmailJobStatus.RETRY_SCHEDULED] },
                createdAt: { lt: transactionalCutoff }
            },
            data: {
                status: EmailJobStatus.CANCELLED,
                lockedAt: null,
                lastError: "Email transacional expirou antes do envio"
            }
        });

        const jobs = await this.prisma.emailJob.findMany({
            where: {
                status: { in: [EmailJobStatus.PENDING, EmailJobStatus.RETRY_SCHEDULED] },
                nextAttemptAt: { lte: now },
                attempts: { lt: MAX_ATTEMPTS },
                OR: [
                    {
                        type: EmailJobType.PASSWORD_RESET,
                        createdAt: { gte: passwordResetCutoff }
                    },
                    {
                        type: { not: EmailJobType.PASSWORD_RESET },
                        createdAt: { gte: transactionalCutoff }
                    }
                ]
            },
            orderBy: { nextAttemptAt: "asc" },
            take: limit
        });

        const summary: EmailWorkerSummary = {
            selected: jobs.length,
            sent: 0,
            retryScheduled: 0,
            failed: 0,
            skipped: 0,
            staleCancelled: expiredPasswordResets.count + expiredTransactionalEmails.count
        };
        for (const job of jobs) {
            const result = await this.processJob(job.id);
            if (result === "SENT") summary.sent += 1;
            if (result === "RETRY_SCHEDULED") summary.retryScheduled += 1;
            if (result === "FAILED") summary.failed += 1;
            if (result === "SKIPPED") summary.skipped += 1;
        }
        return summary;
    }

    private async processJob(jobId: number): Promise<ProcessJobResult> {
        const claimed = await this.prisma.emailJob.updateMany({
            where: {
                id: jobId,
                status: { in: [EmailJobStatus.PENDING, EmailJobStatus.RETRY_SCHEDULED] },
                attempts: { lt: MAX_ATTEMPTS }
            },
            data: {
                status: EmailJobStatus.PROCESSING,
                attempts: { increment: 1 },
                lockedAt: new Date()
            }
        });
        if (claimed.count === 0) return "SKIPPED";

        const job = await this.prisma.emailJob.findUniqueOrThrow({ where: { id: jobId } });
        let rendered;
        try {
            rendered = renderEmail(job.type, job.payload);
        } catch (error) {
            await this.prisma.emailJob.update({
                where: { id: job.id },
                data: {
                    status: EmailJobStatus.FAILED,
                    lockedAt: null,
                    ...(job.type === EmailJobType.PASSWORD_RESET ? { payload: {} } : {}),
                    lastError:
                        error instanceof Error
                            ? error.message.slice(0, 500)
                            : "Payload de email invalido"
                }
            });
            return "FAILED";
        }
        const idempotencyKey = `email-job:${job.uuid}`;
        const log = await this.prisma.emailDeliveryLog.create({
            data: {
                uuid: createUuid(),
                emailJobId: job.id,
                attemptNumber: job.attempts,
                emailType: job.type,
                recipient: job.recipient,
                subject: rendered.subject,
                idempotencyKey
            }
        });

        try {
            const result = await this.provider.send({
                to: job.recipient,
                subject: rendered.subject,
                html: rendered.html,
                text: rendered.text,
                idempotencyKey
            });
            const completedAt = new Date();
            await this.prisma.$transaction([
                this.prisma.emailDeliveryLog.update({
                    where: { id: log.id },
                    data: {
                        status: EmailDeliveryStatus.ACCEPTED,
                        providerMessageId: result.messageId,
                        completedAt
                    }
                }),
                this.prisma.emailJob.update({
                    where: { id: job.id },
                    data: {
                        status: EmailJobStatus.SENT,
                        providerMessageId: result.messageId,
                        sentAt: completedAt,
                        lockedAt: null,
                        lastError: null,
                        ...(job.type === EmailJobType.PASSWORD_RESET ? { payload: {} } : {})
                    }
                })
            ]);
            return "SENT";
        } catch (error) {
            const detail = errorDetails(error);
            const exhausted = job.attempts >= MAX_ATTEMPTS;
            const delay = RETRY_DELAYS_MS[job.attempts - 1] ?? 0;
            await this.prisma.$transaction([
                this.prisma.emailDeliveryLog.update({
                    where: { id: log.id },
                    data: {
                        status: EmailDeliveryStatus.FAILED,
                        errorCode: detail.code,
                        errorMessage: detail.message,
                        completedAt: new Date()
                    }
                }),
                this.prisma.emailJob.update({
                    where: { id: job.id },
                    data: {
                        status: exhausted ? EmailJobStatus.FAILED : EmailJobStatus.RETRY_SCHEDULED,
                        nextAttemptAt: exhausted ? job.nextAttemptAt : new Date(Date.now() + delay),
                        lockedAt: null,
                        lastError: detail.message,
                        ...(exhausted && job.type === EmailJobType.PASSWORD_RESET
                            ? { payload: {} }
                            : {})
                    }
                })
            ]);
            return exhausted ? "FAILED" : "RETRY_SCHEDULED";
        }
    }
}
