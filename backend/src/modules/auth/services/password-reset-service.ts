import { Prisma, PrismaClient } from "../../../generated/prisma/client";
import { EmailJobStatus, EmailJobType } from "../../../generated/prisma/enums";
import { Either, left, right } from "../../../core/either/either";
import { AppError } from "../../../core/errors/app-error";
import { hashPassword } from "../../../core/security/password";
import {
    digestPasswordResetCode,
    generatePasswordResetCode,
    passwordResetCodeMatches,
    passwordResetSecret
} from "../../../core/security/password-reset-code";
import { normalizeEmail } from "../../../core/utils/email";
import { createUuid } from "../../../core/utils/uuid";
import { createEmailJob } from "../../emails/email-job";

const CODE_TTL_MS = 10 * 60 * 1000;
const RESEND_COOLDOWN_MS = 60 * 1000;
const MAX_ATTEMPTS = 5;
const GENERIC_REQUEST_MESSAGE =
    "Se existir uma conta ativa para este email, enviaremos um codigo de recuperacao";
const GENERIC_INVALID_CODE_MESSAGE = "Codigo invalido ou expirado";

type RequestPasswordResetInput = {
    email: string;
};

type ConfirmPasswordResetInput = {
    email: string;
    code: string;
    newPassword: string;
};

function isSerializationConflict(error: unknown) {
    return error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2034";
}

export class PasswordResetService {
    public constructor(
        private readonly prisma: PrismaClient,
        private readonly secret = passwordResetSecret()
    ) {}

    public async request(
        input: RequestPasswordResetInput
    ): Promise<Either<AppError, { message: string }>> {
        const email = normalizeEmail(input.email);
        const user = await this.prisma.user.findUnique({
            where: { email },
            select: { id: true, name: true, email: true, isActive: true }
        });

        if (!user?.isActive) return right({ message: GENERIC_REQUEST_MESSAGE });

        const code = generatePasswordResetCode();
        const challengeUuid = createUuid();
        const codeDigest = digestPasswordResetCode(challengeUuid, code, this.secret);

        await this.serializable(async (transaction) => {
            const now = new Date();
            const current = await transaction.passwordResetChallenge.findUnique({
                where: { userId: user.id }
            });
            if (current && now.getTime() - current.lastSentAt.getTime() < RESEND_COOLDOWN_MS) {
                return;
            }

            if (current?.emailJobId) {
                await transaction.emailJob.updateMany({
                    where: {
                        id: current.emailJobId,
                        status: {
                            in: [EmailJobStatus.PENDING, EmailJobStatus.RETRY_SCHEDULED]
                        }
                    },
                    data: {
                        status: EmailJobStatus.CANCELLED,
                        payload: {},
                        lockedAt: null
                    }
                });
            }

            const emailJob = await transaction.emailJob.create({
                data: createEmailJob({
                    type: EmailJobType.PASSWORD_RESET,
                    recipient: user.email,
                    deduplicationKey: `password-reset:${challengeUuid}`,
                    payload: {
                        customerName: user.name,
                        resetCode: code,
                        expiresInMinutes: 10
                    }
                })
            });

            await transaction.passwordResetChallenge.upsert({
                where: { userId: user.id },
                create: {
                    uuid: challengeUuid,
                    userId: user.id,
                    emailJobId: emailJob.id,
                    codeDigest,
                    expiresAt: new Date(now.getTime() + CODE_TTL_MS),
                    attempts: 0,
                    lastSentAt: now
                },
                update: {
                    uuid: challengeUuid,
                    emailJobId: emailJob.id,
                    codeDigest,
                    expiresAt: new Date(now.getTime() + CODE_TTL_MS),
                    attempts: 0,
                    lastSentAt: now,
                    consumedAt: null
                }
            });
        });

        return right({ message: GENERIC_REQUEST_MESSAGE });
    }

    public async confirm(
        input: ConfirmPasswordResetInput
    ): Promise<Either<AppError, { message: string }>> {
        const email = normalizeEmail(input.email);
        const passwordHash = await hashPassword(input.newPassword);

        const changed = await this.serializable(async (transaction) => {
            const now = new Date();
            const user = await transaction.user.findUnique({
                where: { email },
                include: { passwordResetChallenge: true }
            });
            const challenge = user?.passwordResetChallenge;

            if (
                !user?.isActive ||
                !challenge ||
                challenge.consumedAt ||
                challenge.expiresAt <= now ||
                challenge.attempts >= MAX_ATTEMPTS
            ) {
                return false;
            }

            const actualDigest = digestPasswordResetCode(challenge.uuid, input.code, this.secret);
            if (!passwordResetCodeMatches(challenge.codeDigest, actualDigest)) {
                const attempts = challenge.attempts + 1;
                await transaction.passwordResetChallenge.update({
                    where: { id: challenge.id },
                    data: {
                        attempts,
                        consumedAt: attempts >= MAX_ATTEMPTS ? now : null
                    }
                });
                return false;
            }

            await transaction.user.update({
                where: { id: user.id },
                data: {
                    passwordHash,
                    authVersion: { increment: 1 }
                }
            });
            await transaction.passwordResetChallenge.update({
                where: { id: challenge.id },
                data: { consumedAt: now }
            });
            return true;
        });

        if (!changed) return left(AppError.unauthorized(GENERIC_INVALID_CODE_MESSAGE));
        return right({ message: "Senha redefinida com sucesso" });
    }

    private async serializable<T>(
        operation: (transaction: Prisma.TransactionClient) => Promise<T>
    ): Promise<T> {
        for (let attempt = 1; attempt <= 3; attempt += 1) {
            try {
                return await this.prisma.$transaction(operation, {
                    isolationLevel: Prisma.TransactionIsolationLevel.Serializable
                });
            } catch (error) {
                if (!isSerializationConflict(error) || attempt === 3) throw error;
            }
        }
        throw new Error("Transacao serializavel nao concluida");
    }
}
