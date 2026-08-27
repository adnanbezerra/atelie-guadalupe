import { PrismaClient } from "../../../generated/prisma/client";
import { FulfillmentJobStatus, OrderStatus, RoleName } from "../../../generated/prisma/enums";
import { createUuid } from "../../../core/utils/uuid";
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
                status: { in: [FulfillmentJobStatus.PENDING, FulfillmentJobStatus.RETRY_SCHEDULED] },
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
        const order = await this.prisma.order.findUnique({ where: { uuid: orderUuid } });
        if (!order) return false;
        await this.enqueue(order.id);
        const job = await this.prisma.fulfillmentJob.update({
            where: { orderId: order.id },
            data: {
                status: FulfillmentJobStatus.PENDING,
                attempts: 0,
                nextAttemptAt: new Date(),
                lockedAt: null,
                completedAt: null,
                lastError: null
            }
        });
        await this.processJob(job.id, orderUuid);
        return true;
    }

    private async processJob(jobId: number, orderUuid: string) {
        const claimed = await this.prisma.fulfillmentJob.updateMany({
            where: {
                id: jobId,
                status: { in: [FulfillmentJobStatus.PENDING, FulfillmentJobStatus.RETRY_SCHEDULED] },
                attempts: { lt: this.maxAttempts() }
            },
            data: {
                status: FulfillmentJobStatus.PROCESSING,
                lockedAt: new Date(),
                attempts: { increment: 1 }
            }
        });
        if (claimed.count === 0) return;

        try {
            const order = await this.prisma.order.findUniqueOrThrow({
                where: { uuid: orderUuid },
                select: { status: true }
            });
            if (order.status !== OrderStatus.PAID && order.status !== OrderStatus.PROCESSING) {
                await this.prisma.fulfillmentJob.update({
                    where: { id: jobId },
                    data: {
                        status: FulfillmentJobStatus.FAILED,
                        lockedAt: null,
                        lastError: `Pedido em estado ${order.status} nao pode ser processado`
                    }
                });
                return;
            }

            const result = await this.shippingService.checkoutOrder(
                { sub: "system", role: RoleName.ADMIN },
                orderUuid
            );
            if (!result.success) throw result.value;
            await this.prisma.$transaction([
                this.prisma.fulfillmentJob.update({
                    where: { id: jobId },
                    data: {
                        status: FulfillmentJobStatus.COMPLETED,
                        completedAt: new Date(),
                        lockedAt: null,
                        lastError: null
                    }
                }),
                this.prisma.order.updateMany({
                    where: { uuid: orderUuid, status: OrderStatus.PAID },
                    data: { status: OrderStatus.PROCESSING }
                })
            ]);
        } catch (error) {
            const job = await this.prisma.fulfillmentJob.findUniqueOrThrow({
                where: { id: jobId }
            });
            const exhausted = job.attempts >= this.maxAttempts();
            const delaySeconds = Math.min(3600, 30 * 2 ** Math.min(job.attempts, 7));
            await this.prisma.fulfillmentJob.update({
                where: { id: jobId },
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
}
