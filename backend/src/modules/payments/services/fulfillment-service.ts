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
        const staleBefore = new Date(
            Date.now() - Number(process.env.FULFILLMENT_WORKER_LOCK_TIMEOUT_MS ?? 300000)
        );
        await this.prisma.fulfillmentJob.updateMany({
            where: {
                status: FulfillmentJobStatus.PROCESSING,
                lockedAt: { lt: staleBefore }
            },
            data: {
                status: FulfillmentJobStatus.RETRY_SCHEDULED,
                nextAttemptAt: new Date(),
                lockedAt: null,
                lastError: "Processamento interrompido; tarefa recuperada automaticamente"
            }
        });

        const jobs = await this.prisma.fulfillmentJob.findMany({
            where: {
                status: {
                    in: [FulfillmentJobStatus.PENDING, FulfillmentJobStatus.RETRY_SCHEDULED]
                },
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
                nextAttemptAt: new Date(),
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
                status: { in: [FulfillmentJobStatus.PENDING, FulfillmentJobStatus.RETRY_SCHEDULED] }
            },
            data: {
                status: FulfillmentJobStatus.PROCESSING,
                lockedAt: new Date(),
                attempts: { increment: 1 }
            }
        });
        if (claimed.count === 0) return;

        try {
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
            const delaySeconds = Math.min(3600, 30 * 2 ** Math.min(job.attempts, 7));
            await this.prisma.fulfillmentJob.update({
                where: { id: jobId },
                data: {
                    status: FulfillmentJobStatus.RETRY_SCHEDULED,
                    nextAttemptAt: new Date(Date.now() + delaySeconds * 1000),
                    lockedAt: null,
                    lastError:
                        error instanceof Error ? error.message.slice(0, 500) : "Falha desconhecida"
                }
            });
        }
    }
}
