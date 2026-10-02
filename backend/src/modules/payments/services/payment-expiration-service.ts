import { Prisma, PrismaClient } from "../../../generated/prisma/client";
import { CartItemStatus, OrderStatus, PaymentStatus } from "../../../generated/prisma/enums";
import { createUuid } from "../../../core/utils/uuid";

const DEFAULT_EXPIRATION_MINUTES = 15;
const BATCH_SIZE = 100;

export class PaymentExpirationService {
    public constructor(private readonly prisma: PrismaClient) {}

    public async processDue(now = new Date()) {
        const cutoff = new Date(now.getTime() - this.expirationMinutes() * 60_000);
        const payments = await this.prisma.orderPayment.findMany({
            where: {
                status: PaymentStatus.PENDING,
                updatedAt: { lte: cutoff },
                order: { status: OrderStatus.AWAITING_PAYMENT }
            },
            select: { id: true },
            orderBy: { id: "asc" },
            take: BATCH_SIZE
        });

        let expired = 0;
        for (const payment of payments) {
            if (await this.expire(payment.id, cutoff)) expired += 1;
        }
        return { expired };
    }

    private async expire(paymentId: number, cutoff: Date) {
        return this.prisma.$transaction(async (tx) => {
            await tx.$queryRaw(
                Prisma.sql`SELECT "id" FROM "OrderPayment" WHERE "id" = ${paymentId} FOR UPDATE`
            );
            const payment = await tx.orderPayment.findUnique({
                where: { id: paymentId },
                include: { order: { include: { items: true } } }
            });
            if (
                !payment ||
                payment.status !== PaymentStatus.PENDING ||
                payment.updatedAt > cutoff ||
                payment.order.status !== OrderStatus.AWAITING_PAYMENT
            ) {
                return false;
            }

            const cancelled = await tx.order.updateMany({
                where: { id: payment.orderId, status: OrderStatus.AWAITING_PAYMENT },
                data: { status: OrderStatus.CANCELLED }
            });
            if (cancelled.count !== 1) return false;

            await tx.orderPayment.update({
                where: { id: payment.id },
                data: { status: PaymentStatus.EXPIRED }
            });

            const cart = await tx.cart.upsert({
                where: { userId: payment.order.userId },
                create: { uuid: createUuid(), userId: payment.order.userId },
                update: {},
                select: { id: true }
            });
            for (const item of payment.order.items) {
                if (item.productId === null) continue;
                await tx.cartItem.upsert({
                    where: {
                        cartId_productId_productSize: {
                            cartId: cart.id,
                            productId: item.productId,
                            productSize: item.productSize
                        }
                    },
                    create: {
                        uuid: createUuid(),
                        cartId: cart.id,
                        productId: item.productId,
                        productSize: item.productSize,
                        quantity: item.quantity,
                        unitPriceInCents: item.unitPriceInCents,
                        productNameSnapshot: item.productNameSnapshot
                    },
                    update: {
                        quantity: { increment: item.quantity },
                        status: CartItemStatus.ACTIVE
                    }
                });
            }
            return true;
        });
    }

    private expirationMinutes() {
        return Number(process.env.PAYMENT_EXPIRATION_MINUTES ?? DEFAULT_EXPIRATION_MINUTES);
    }
}
