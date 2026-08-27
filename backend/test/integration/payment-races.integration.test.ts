import * as assert from "node:assert";
import { setTimeout as delay } from "node:timers/promises";
import { test } from "node:test";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "../../src/generated/prisma/client";
import { OrderStatus, PaymentStatus } from "../../src/generated/prisma/enums";
import { createUuid } from "../../src/core/utils/uuid";
import { OrderRepository } from "../../src/modules/orders/repositories/order-repository";

const enabled = process.env.RUN_CHECKOUT_RACE_INTEGRATION === "true";
const skipReason = !enabled
    ? "Defina RUN_CHECKOUT_RACE_INTEGRATION=true para testar concorrencia no PostgreSQL"
    : !process.env.DATABASE_URL
      ? "DATABASE_URL nao configurada"
      : false;

function deferred() {
    let resolve!: () => void;
    const promise = new Promise<void>((done) => {
        resolve = done;
    });
    return { promise, resolve };
}

function prismaClient() {
    return new PrismaClient({
        adapter: new PrismaPg({ connectionString: process.env.DATABASE_URL! })
    });
}

test(
    "PostgreSQL serializes cancellation against checkout persistence and payment confirmation",
    { skip: skipReason, timeout: 30_000 },
    async (t) => {
        const writer = prismaClient();
        const contender = prismaClient();
        t.after(async () => {
            await Promise.all([writer.$disconnect(), contender.$disconnect()]);
        });

        const user = await writer.user.findFirst({ select: { id: true } });
        if (!user) return t.skip("Banco sem usuario para vincular pedidos de teste");

        const orderUuids: string[] = [];
        t.after(async () => {
            await writer.order.deleteMany({ where: { uuid: { in: orderUuids } } });
        });

        const createOrder = async (providerCheckoutId: string | null = null) => {
            const uuid = createUuid();
            orderUuids.push(uuid);
            return writer.order.create({
                data: {
                    uuid,
                    paymentIdempotencyKey: createUuid(),
                    userId: user.id,
                    status: OrderStatus.AWAITING_PAYMENT,
                    subtotalInCents: 100,
                    totalInCents: 100,
                    payment: {
                        create: {
                            uuid: createUuid(),
                            idempotencyKey: createUuid(),
                            expectedAmountInCents: 100,
                            status: providerCheckoutId
                                ? PaymentStatus.PENDING
                                : PaymentStatus.CREATING,
                            providerCheckoutId
                        }
                    }
                },
                include: { payment: true }
            });
        };

        // Persistencia vence: checkoutReference na propria linha impede cancelamento apos EPQ.
        const persistenceWinner = await createOrder();
        const orderLocked = deferred();
        const releasePersistence = deferred();
        const persistence = writer.$transaction(async (tx) => {
            await tx.order.updateMany({
                where: {
                    id: persistenceWinner.id,
                    status: { in: [OrderStatus.PENDING, OrderStatus.AWAITING_PAYMENT] }
                },
                data: {
                    status: OrderStatus.AWAITING_PAYMENT,
                    checkoutProvider: "ABACATEPAY",
                    checkoutReference: "checkout_persistence_wins"
                }
            });
            orderLocked.resolve();
            await releasePersistence.promise;
            await tx.orderPayment.update({
                where: { orderId: persistenceWinner.id },
                data: {
                    status: PaymentStatus.PENDING,
                    providerCheckoutId: "checkout_persistence_wins"
                }
            });
        });
        await orderLocked.promise;
        const rejectedCancellation = new OrderRepository(contender).cancelIfNoActiveCheckout(
            persistenceWinner.uuid
        );
        await delay(25);
        releasePersistence.resolve();
        await persistence;
        assert.equal(await rejectedCancellation, null);
        const persisted = await writer.order.findUniqueOrThrow({
            where: { id: persistenceWinner.id },
            include: { payment: true }
        });
        assert.equal(persisted.status, OrderStatus.AWAITING_PAYMENT);
        assert.equal(persisted.checkoutReference, "checkout_persistence_wins");
        assert.equal(persisted.payment?.providerCheckoutId, "checkout_persistence_wins");

        // Cancelamento vence: persistencia registra cobranca, mas nao ressuscita pedido.
        const cancellationWinner = await createOrder();
        const cancellationLocked = deferred();
        const releaseCancellation = deferred();
        const cancellation = writer.$transaction(async (tx) => {
            const changed = await tx.order.updateMany({
                where: {
                    id: cancellationWinner.id,
                    status: OrderStatus.AWAITING_PAYMENT,
                    checkoutReference: null,
                    OR: [
                        { payment: { is: null } },
                        { payment: { is: { providerCheckoutId: null } } }
                    ]
                },
                data: { status: OrderStatus.CANCELLED }
            });
            assert.equal(changed.count, 1);
            cancellationLocked.resolve();
            await releaseCancellation.promise;
        });
        await cancellationLocked.promise;
        const latePersistence = contender.$transaction(async (tx) => {
            const changed = await tx.order.updateMany({
                where: {
                    id: cancellationWinner.id,
                    status: { in: [OrderStatus.PENDING, OrderStatus.AWAITING_PAYMENT] }
                },
                data: {
                    status: OrderStatus.AWAITING_PAYMENT,
                    checkoutProvider: "ABACATEPAY",
                    checkoutReference: "checkout_cancellation_wins"
                }
            });
            await tx.orderPayment.update({
                where: { orderId: cancellationWinner.id },
                data: {
                    status: PaymentStatus.PENDING,
                    providerCheckoutId: "checkout_cancellation_wins"
                }
            });
            return changed.count;
        });
        await delay(25);
        releaseCancellation.resolve();
        await cancellation;
        assert.equal(await latePersistence, 0);
        const cancelled = await writer.order.findUniqueOrThrow({
            where: { id: cancellationWinner.id },
            include: { payment: true }
        });
        assert.equal(cancelled.status, OrderStatus.CANCELLED);
        assert.equal(cancelled.checkoutReference, null);
        assert.equal(cancelled.payment?.providerCheckoutId, "checkout_cancellation_wins");

        // Confirmacao vence: cancelamento concorrente falha e um unico fulfillment nasce.
        const completedWinner = await createOrder("checkout_completed_wins");
        const confirmationLocked = deferred();
        const releaseConfirmation = deferred();
        const confirmation = writer.$transaction(async (tx) => {
            const changed = await tx.order.updateMany({
                where: { id: completedWinner.id, status: OrderStatus.AWAITING_PAYMENT },
                data: { status: OrderStatus.PAID }
            });
            assert.equal(changed.count, 1);
            confirmationLocked.resolve();
            await releaseConfirmation.promise;
            await tx.orderPayment.update({
                where: { orderId: completedWinner.id },
                data: { status: PaymentStatus.PAID, paidAmountInCents: 100, paidAt: new Date() }
            });
            await tx.fulfillmentJob.create({
                data: { uuid: createUuid(), orderId: completedWinner.id }
            });
        });
        await confirmationLocked.promise;
        const cancellationAfterPayment = new OrderRepository(contender).cancelIfNoActiveCheckout(
            completedWinner.uuid
        );
        await delay(25);
        releaseConfirmation.resolve();
        await confirmation;
        assert.equal(await cancellationAfterPayment, null);
        const paid = await writer.order.findUniqueOrThrow({
            where: { id: completedWinner.id },
            include: { payment: true, fulfillmentJob: true }
        });
        assert.equal(paid.status, OrderStatus.PAID);
        assert.equal(paid.payment?.status, PaymentStatus.PAID);
        assert.ok(paid.fulfillmentJob);
    }
);
