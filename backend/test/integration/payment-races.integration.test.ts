import * as assert from "node:assert";
import { setTimeout as delay } from "node:timers/promises";
import { test } from "node:test";
import { PrismaPg } from "@prisma/adapter-pg";
import { Prisma, PrismaClient } from "../../src/generated/prisma/client";
import { FulfillmentJobStatus, OrderStatus, PaymentStatus } from "../../src/generated/prisma/enums";
import { createUuid } from "../../src/core/utils/uuid";
import { OrderRepository } from "../../src/modules/orders/repositories/order-repository";
import { FulfillmentService } from "../../src/modules/payments/services/fulfillment-service";

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

async function waitUntilBlockedBy(observer: PrismaClient, blockerPid: number, description: string) {
    const deadline = Date.now() + 5_000;
    while (Date.now() < deadline) {
        const blocked = await observer.$queryRaw<Array<{ pid: number }>>(
            Prisma.sql`SELECT pid FROM pg_stat_activity WHERE ${blockerPid} = ANY(pg_blocking_pids(pid))`
        );
        if (blocked.length > 0) return;
        await delay(10);
    }
    assert.fail(`PostgreSQL nao registrou espera pelo lock: ${description}`);
}

async function waitUntilBlocked(observer: PrismaClient, waiterPid: number, description: string) {
    const deadline = Date.now() + 5_000;
    while (Date.now() < deadline) {
        const [waiter] = await observer.$queryRaw<Array<{ blockers: number }>>(
            Prisma.sql`SELECT cardinality(pg_blocking_pids(pid))::int AS blockers FROM pg_stat_activity WHERE pid = ${waiterPid}`
        );
        if (waiter?.blockers > 0) return;
        await delay(10);
    }
    assert.fail(`PostgreSQL nao registrou espera pelo lock: ${description}`);
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

test(
    "PostgreSQL serializes terminal payment state against fulfillment label authorization",
    { skip: skipReason, timeout: 40_000 },
    async (t) => {
        const fulfillmentClient = prismaClient();
        const terminalClient = prismaClient();
        const observer = prismaClient();
        const releases: Array<() => void> = [];
        t.after(async () => {
            for (const release of releases) release();
            await Promise.all([
                fulfillmentClient.$disconnect(),
                terminalClient.$disconnect(),
                observer.$disconnect()
            ]);
        });

        const previousProviderTimeout = process.env.SUPERFRETE_TIMEOUT_MS;
        const previousTransactionTimeout = process.env.FULFILLMENT_TRANSACTION_TIMEOUT_MS;
        process.env.SUPERFRETE_TIMEOUT_MS = "100";
        process.env.FULFILLMENT_TRANSACTION_TIMEOUT_MS = "10400";
        t.after(() => {
            if (previousProviderTimeout === undefined) delete process.env.SUPERFRETE_TIMEOUT_MS;
            else process.env.SUPERFRETE_TIMEOUT_MS = previousProviderTimeout;
            if (previousTransactionTimeout === undefined) {
                delete process.env.FULFILLMENT_TRANSACTION_TIMEOUT_MS;
            } else {
                process.env.FULFILLMENT_TRANSACTION_TIMEOUT_MS = previousTransactionTimeout;
            }
        });

        const user = await fulfillmentClient.user.findFirst({ select: { id: true } });
        if (!user) return t.skip("Banco sem usuario para vincular pedidos de teste");

        const orderUuids: string[] = [];
        t.after(async () => {
            await fulfillmentClient.order.deleteMany({ where: { uuid: { in: orderUuids } } });
        });
        const createPaidOrder = async () => {
            const uuid = createUuid();
            orderUuids.push(uuid);
            return fulfillmentClient.order.create({
                data: {
                    uuid,
                    paymentIdempotencyKey: createUuid(),
                    userId: user.id,
                    status: OrderStatus.PAID,
                    subtotalInCents: 100,
                    totalInCents: 100,
                    payment: {
                        create: {
                            uuid: createUuid(),
                            idempotencyKey: createUuid(),
                            expectedAmountInCents: 100,
                            paidAmountInCents: 100,
                            paidAt: new Date(),
                            status: PaymentStatus.PAID,
                            providerCheckoutId: `checkout_${uuid}`
                        }
                    },
                    fulfillmentJob: { create: { uuid: createUuid() } }
                },
                include: { payment: true, fulfillmentJob: true }
            });
        };
        const terminalTransition = async (
            orderId: number,
            hooks: {
                beforeLock?: (pid: number) => void;
                afterPaymentUpdate?: (pid: number) => Promise<void>;
            } = {}
        ) =>
            terminalClient.$transaction(async (tx) => {
                const [connection] = await tx.$queryRaw<Array<{ pid: number }>>(
                    Prisma.sql`SELECT pg_backend_pid() AS pid`
                );
                hooks.beforeLock?.(connection.pid);
                await tx.$queryRaw(
                    Prisma.sql`SELECT "id" FROM "OrderPayment" WHERE "orderId" = ${orderId} FOR UPDATE`
                );
                await tx.orderPayment.update({
                    where: { orderId },
                    data: { status: PaymentStatus.LOST, lostAt: new Date() }
                });
                if (hooks.afterPaymentUpdate) {
                    await hooks.afterPaymentUpdate(connection.pid);
                }
                await tx.fulfillmentJob.updateMany({
                    where: {
                        orderId,
                        status: {
                            in: [
                                FulfillmentJobStatus.PENDING,
                                FulfillmentJobStatus.PROCESSING,
                                FulfillmentJobStatus.RETRY_SCHEDULED
                            ]
                        }
                    },
                    data: {
                        status: FulfillmentJobStatus.FAILED,
                        lockedAt: null,
                        lastError: "Pagamento em estado LOST; fulfillment bloqueado"
                    }
                });
                return connection.pid;
            });

        // Fulfillment segura OrderPayment: terminal espera; autorizacao conclui primeiro.
        const fulfillmentWinner = await createPaidOrder();
        const shippingStarted = deferred();
        const releaseShipping = deferred();
        releases.push(releaseShipping.resolve);
        let firstCheckoutCalls = 0;
        const firstService = new FulfillmentService(fulfillmentClient) as unknown as {
            shippingService: { checkoutOrder(): Promise<{ success: true; value: object }> };
            processJob(jobId: number, orderUuid: string): Promise<void>;
        };
        firstService.shippingService = {
            checkoutOrder: async () => {
                firstCheckoutCalls += 1;
                shippingStarted.resolve();
                await releaseShipping.promise;
                return { success: true, value: {} };
            }
        };
        const firstFulfillment = firstService.processJob(
            fulfillmentWinner.fulfillmentJob!.id,
            fulfillmentWinner.uuid
        );
        await shippingStarted.promise;

        let firstTerminalSettled = false;
        let firstTerminalPid = 0;
        const firstTerminalStarted = deferred();
        const firstTerminal = terminalTransition(fulfillmentWinner.id, {
            beforeLock: (pid) => {
                firstTerminalPid = pid;
                firstTerminalStarted.resolve();
            }
        }).finally(() => {
            firstTerminalSettled = true;
        });
        await firstTerminalStarted.promise;
        await waitUntilBlocked(observer, firstTerminalPid, "terminal apos fulfillment");
        assert.equal(firstTerminalSettled, false);
        releaseShipping.resolve();
        await firstFulfillment;
        await firstTerminal;

        const firstResult = await fulfillmentClient.order.findUniqueOrThrow({
            where: { id: fulfillmentWinner.id },
            include: { payment: true, fulfillmentJob: true }
        });
        assert.equal(firstCheckoutCalls, 1);
        assert.equal(firstResult.payment?.status, PaymentStatus.LOST);
        assert.equal(firstResult.fulfillmentJob?.status, FulfillmentJobStatus.COMPLETED);
        assert.equal(firstResult.fulfillmentJob?.attempts, 1);

        // Terminal segura OrderPayment: fulfillment espera no FOR UPDATE e nao autoriza etiqueta.
        const terminalWinner = await createPaidOrder();
        const terminalUpdatedPayment = deferred();
        const releaseTerminal = deferred();
        releases.push(releaseTerminal.resolve);
        let terminalBlockerPid = 0;
        const secondTerminal = terminalTransition(terminalWinner.id, {
            afterPaymentUpdate: async (pid) => {
                terminalBlockerPid = pid;
                terminalUpdatedPayment.resolve();
                await releaseTerminal.promise;
            }
        });
        await terminalUpdatedPayment.promise;

        let secondCheckoutCalls = 0;
        const secondService = new FulfillmentService(fulfillmentClient) as unknown as {
            shippingService: { checkoutOrder(): Promise<{ success: true; value: object }> };
            processJob(jobId: number, orderUuid: string): Promise<void>;
        };
        secondService.shippingService = {
            checkoutOrder: async () => {
                secondCheckoutCalls += 1;
                return { success: true, value: {} };
            }
        };
        const secondFulfillment = secondService.processJob(
            terminalWinner.fulfillmentJob!.id,
            terminalWinner.uuid
        );
        await waitUntilBlockedBy(observer, terminalBlockerPid, "fulfillment apos terminal");
        releaseTerminal.resolve();
        await secondTerminal;
        await secondFulfillment;

        const secondResult = await fulfillmentClient.order.findUniqueOrThrow({
            where: { id: terminalWinner.id },
            include: { payment: true, fulfillmentJob: true }
        });
        assert.equal(secondCheckoutCalls, 0);
        assert.equal(secondResult.payment?.status, PaymentStatus.LOST);
        assert.equal(secondResult.fulfillmentJob?.status, FulfillmentJobStatus.FAILED);
        assert.equal(secondResult.fulfillmentJob?.attempts, 1);
        assert.equal(secondResult.fulfillmentJob?.completedAt, null);
    }
);
