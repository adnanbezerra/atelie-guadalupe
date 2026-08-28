import { Prisma, PrismaClient } from "../../../generated/prisma/client";
import {
    FulfillmentJobStatus,
    OrderStatus,
    PaymentStatus,
    RoleName
} from "../../../generated/prisma/enums";
import { createUuid } from "../../../core/utils/uuid";
import {
    minimumFulfillmentTransactionTimeoutMs,
    minimumFulfillmentWorkerLockTimeoutMs
} from "../../../core/config/fulfillment-timing";
import { AppError } from "../../../core/errors/app-error";
import { PlatformRepository } from "../../platforms/repositories/platform-repository";
import { ProductRepository } from "../../products/repositories/product-repository";
import { ShippingRepository } from "../../shipping/repositories/shipping-repository";
import { ShippingService } from "../../shipping/services/shipping-service";
import { SuperFreteClient } from "../../shipping/services/superfrete-client";

export class FulfillmentService {
    private readonly shippingService: ShippingService;

    public constructor(private readonly prisma: PrismaClient) {
        this.shippingService = new ShippingService(
            new ShippingRepository(prisma),
            new PlatformRepository(prisma),
            SuperFreteClient.fromEnv(),
            new ProductRepository(prisma)
        );
    }

    public enqueue(orderId: number) {
        return this.prisma.fulfillmentJob.upsert({
            where: { orderId },
            create: { uuid: createUuid(), orderId },
            update: {}
        });
    }

    public async processDue(limit = 10) {
        const maxAttempts = this.maxAttempts();
        const staleBefore = new Date(
            Date.now() - Number(process.env.FULFILLMENT_WORKER_LOCK_TIMEOUT_MS ?? 300000)
        );
        await this.prisma.fulfillmentJob.updateMany({
            where: {
                status: FulfillmentJobStatus.PROCESSING,
                lockedAt: { lt: staleBefore },
                attempts: { gte: maxAttempts }
            },
            data: {
                status: FulfillmentJobStatus.FAILED,
                lockedAt: null,
                lastError: "Limite de tentativas atingido apos interrupcao do processamento"
            }
        });
        await this.prisma.fulfillmentJob.updateMany({
            where: {
                status: FulfillmentJobStatus.PROCESSING,
                lockedAt: { lt: staleBefore },
                attempts: { lt: maxAttempts }
            },
            data: {
                status: FulfillmentJobStatus.RETRY_SCHEDULED,
                nextAttemptAt: new Date(),
                lockedAt: null,
                lastError: "Processamento interrompido; tarefa recuperada automaticamente"
            }
        });
        await this.prisma.fulfillmentJob.updateMany({
            where: {
                status: {
                    in: [FulfillmentJobStatus.PENDING, FulfillmentJobStatus.RETRY_SCHEDULED]
                },
                attempts: { gte: maxAttempts }
            },
            data: {
                status: FulfillmentJobStatus.FAILED,
                lockedAt: null,
                lastError: "Limite de tentativas de fulfillment atingido"
            }
        });

        const jobs = await this.prisma.fulfillmentJob.findMany({
            where: {
                status: {
                    in: [FulfillmentJobStatus.PENDING, FulfillmentJobStatus.RETRY_SCHEDULED]
                },
                attempts: { lt: maxAttempts },
                nextAttemptAt: { lte: new Date() }
            },
            include: { order: true },
            orderBy: { nextAttemptAt: "asc" },
            take: limit
        });
        for (const job of jobs) await this.processJob(job.id, job.order.uuid);
    }

    public async retryOrder(orderUuid: string) {
        const job = await this.prisma.$transaction(async (tx) => {
            const found = await tx.order.findUnique({
                where: { uuid: orderUuid },
                select: { id: true }
            });
            if (!found) return null;

            await tx.$queryRaw(
                Prisma.sql`SELECT "id" FROM "OrderPayment" WHERE "orderId" = ${found.id} FOR UPDATE`
            );
            const order = await tx.order.findUnique({
                where: { id: found.id },
                select: { status: true, payment: { select: { status: true } } }
            });
            if (
                !order ||
                (order.status !== OrderStatus.PAID && order.status !== OrderStatus.PROCESSING) ||
                order.payment?.status !== PaymentStatus.PAID
            ) {
                return null;
            }

            return tx.fulfillmentJob.upsert({
                where: { orderId: found.id },
                create: { uuid: createUuid(), orderId: found.id },
                update: {
                    status: FulfillmentJobStatus.PENDING,
                    attempts: 0,
                    nextAttemptAt: new Date(),
                    lockedAt: null,
                    completedAt: null,
                    lastError: null
                }
            });
        });
        if (!job) return false;
        await this.processJob(job.id, orderUuid);
        return true;
    }

    private async processJob(jobId: number, orderUuid: string) {
        const claimed = await this.prisma.fulfillmentJob.updateMany({
            where: {
                id: jobId,
                status: {
                    in: [FulfillmentJobStatus.PENDING, FulfillmentJobStatus.RETRY_SCHEDULED]
                },
                attempts: { lt: this.maxAttempts() },
                order: {
                    status: { in: [OrderStatus.PAID, OrderStatus.PROCESSING] },
                    payment: { is: { status: PaymentStatus.PAID } }
                }
            },
            data: {
                status: FulfillmentJobStatus.PROCESSING,
                lockedAt: new Date(),
                attempts: { increment: 1 }
            }
        });
        if (claimed.count === 0) return;

        try {
            await this.prisma.$transaction(
                async (tx) => {
                    const job = await tx.fulfillmentJob.findUniqueOrThrow({
                        where: { id: jobId },
                        select: { orderId: true }
                    });
                    await tx.$queryRaw(
                        Prisma.sql`SELECT "id" FROM "OrderPayment" WHERE "orderId" = ${job.orderId} FOR UPDATE`
                    );
                    const order = await tx.order.findUniqueOrThrow({
                        where: { uuid: orderUuid },
                        select: { status: true, payment: { select: { status: true } } }
                    });
                    if (
                        (order.status !== OrderStatus.PAID &&
                            order.status !== OrderStatus.PROCESSING) ||
                        order.payment?.status !== PaymentStatus.PAID
                    ) {
                        await tx.fulfillmentJob.update({
                            where: { id: jobId },
                            data: {
                                status: FulfillmentJobStatus.FAILED,
                                lockedAt: null,
                                lastError: `Pedido em estado ${order.status} ou financeiro ${order.payment?.status ?? "AUSENTE"} nao pode ser processado`
                            }
                        });
                        return;
                    }

                    const result = await this.shippingService.checkoutOrder(
                        { sub: "system", role: RoleName.ADMIN },
                        orderUuid
                    );
                    if (!result.success) throw result.value;
                    await tx.fulfillmentJob.update({
                        where: { id: jobId },
                        data: {
                            status: FulfillmentJobStatus.COMPLETED,
                            completedAt: new Date(),
                            lockedAt: null,
                            lastError: null
                        }
                    });
                    await tx.order.updateMany({
                        where: { uuid: orderUuid, status: OrderStatus.PAID },
                        data: { status: OrderStatus.PROCESSING }
                    });
                },
                { timeout: this.transactionTimeoutMs() }
            );
        } catch (error) {
            const job = await this.prisma.fulfillmentJob.findUniqueOrThrow({
                where: { id: jobId },
                include: { order: { include: { payment: true } } }
            });
            if (
                job.status !== FulfillmentJobStatus.PROCESSING ||
                job.order.payment?.status !== PaymentStatus.PAID
            ) {
                return;
            }
            const exhausted = job.attempts >= this.maxAttempts();
            const delaySeconds = Math.min(3600, 30 * 2 ** Math.min(job.attempts, 7));
            await this.prisma.fulfillmentJob.updateMany({
                where: {
                    id: jobId,
                    status: FulfillmentJobStatus.PROCESSING,
                    order: { payment: { is: { status: PaymentStatus.PAID } } }
                },
                data: {
                    status: exhausted
                        ? FulfillmentJobStatus.FAILED
                        : FulfillmentJobStatus.RETRY_SCHEDULED,
                    nextAttemptAt: new Date(Date.now() + delaySeconds * 1000),
                    lockedAt: null,
                    lastError:
                        error instanceof Error ? error.message.slice(0, 500) : "Falha desconhecida"
                }
            });
        }
    }

    private maxAttempts() {
        const configured = Number(process.env.FULFILLMENT_WORKER_MAX_ATTEMPTS ?? 8);
        return Number.isInteger(configured) && configured > 0 ? configured : 8;
    }

    private transactionTimeoutMs() {
        const providerTimeout = Number(process.env.SUPERFRETE_TIMEOUT_MS ?? 15000);
        if (!Number.isInteger(providerTimeout) || providerTimeout <= 0) {
            throw AppError.serviceUnavailable("SUPERFRETE_TIMEOUT_MS deve ser inteiro positivo");
        }
        const minimum = minimumFulfillmentTransactionTimeoutMs(providerTimeout);
        const configured = Number(process.env.FULFILLMENT_TRANSACTION_TIMEOUT_MS ?? minimum);
        if (!Number.isInteger(configured) || configured < minimum) {
            throw AppError.serviceUnavailable(
                `FULFILLMENT_TRANSACTION_TIMEOUT_MS deve ser no minimo ${minimum}`
            );
        }
        const workerLockTimeout = Number(process.env.FULFILLMENT_WORKER_LOCK_TIMEOUT_MS ?? 300000);
        const minimumWorkerLock = minimumFulfillmentWorkerLockTimeoutMs(configured);
        if (!Number.isInteger(workerLockTimeout) || workerLockTimeout < minimumWorkerLock) {
            throw AppError.serviceUnavailable(
                `FULFILLMENT_WORKER_LOCK_TIMEOUT_MS deve ser no minimo ${minimumWorkerLock}`
            );
        }
        return configured;
    }
}
