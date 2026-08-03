import { PrismaClient } from "../../generated/prisma/client";
import { EmailDeliveryStatus, EmailJobStatus } from "../../generated/prisma/enums";
import { createUuid } from "../../core/utils/uuid";
import { renderEmail } from "./email-templates";
import { EmailProvider, EmailProviderError, ResendEmailProvider } from "./resend-email-provider";

const MAX_ATTEMPTS = 4;
const RETRY_DELAYS_MS = [30_000, 120_000, 600_000];

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
        const staleBefore = new Date(
            Date.now() - Number(process.env.EMAIL_WORKER_LOCK_TIMEOUT_MS ?? 300000)
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

        const jobs = await this.prisma.emailJob.findMany({
            where: {
                status: { in: [EmailJobStatus.PENDING, EmailJobStatus.RETRY_SCHEDULED] },
                nextAttemptAt: { lte: new Date() },
                attempts: { lt: MAX_ATTEMPTS }
            },
            orderBy: { nextAttemptAt: "asc" },
            take: limit
        });

        for (const job of jobs) {
            await this.processJob(job.id);
        }
    }

    private async processJob(jobId: number) {
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
        if (claimed.count === 0) return;

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
                    lastError:
                        error instanceof Error
                            ? error.message.slice(0, 500)
                            : "Payload de email invalido"
                }
            });
            return;
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
                        lastError: null
                    }
                })
            ]);
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
                        lastError: detail.message
                    }
                })
            ]);
        }
    }
}
