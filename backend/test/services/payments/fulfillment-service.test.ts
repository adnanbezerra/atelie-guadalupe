import * as assert from "node:assert";
import { test } from "node:test";
import { FulfillmentJobStatus } from "../../../src/generated/prisma/enums";
import { FulfillmentService } from "../../../src/modules/payments/services/fulfillment-service";

test("fulfillment retry processes the requested order job", async () => {
    const processed: Array<{ jobId: number; orderUuid: string }> = [];
    const prisma = {
        order: {
            findUnique: async ({ where }: { where: { uuid?: string; id?: number } }) =>
                where.uuid
                    ? { id: 7 }
                    : {
                          status: "PAID",
                          payment: { status: "PAID" }
                      }
        },
        fulfillmentJob: {
            upsert: async () => ({ id: 42 })
        },
        $queryRaw: async () => [{ id: 3 }],
        $transaction: async (callback: (tx: Record<string, unknown>) => Promise<unknown>) =>
            callback(prisma)
    };
    const service = new FulfillmentService(prisma as never);
    const testService = service as unknown as {
        processJob(jobId: number, orderUuid: string): Promise<void>;
    };
    testService.processJob = async (jobId, orderUuid) => {
        processed.push({ jobId, orderUuid });
    };

    const found = await service.retryOrder("order-requested");

    assert.equal(found, true);
    assert.deepStrictEqual(processed, [{ jobId: 42, orderUuid: "order-requested" }]);
});

test("fulfillment retry refuses an order with terminal financial state", async () => {
    let jobTouched = false;
    let paymentLocked = false;
    const prisma = {
        order: {
            findUnique: async ({ where }: { where: { uuid?: string; id?: number } }) =>
                where.uuid
                    ? { id: 7 }
                    : {
                          status: "PAID",
                          payment: { status: "DISPUTED" }
                      }
        },
        fulfillmentJob: {
            upsert: async () => {
                jobTouched = true;
            }
        },
        $queryRaw: async () => {
            paymentLocked = true;
            return [{ id: 3 }];
        },
        $transaction: async (callback: (tx: Record<string, unknown>) => Promise<unknown>) =>
            callback(prisma)
    };

    const found = await new FulfillmentService(prisma as never).retryOrder("order-disputed");

    assert.equal(found, false);
    assert.equal(paymentLocked, true);
    assert.equal(jobTouched, false);
});

test("fulfillment marks a cancelled order as terminal failure without retry", async () => {
    const updates: Array<Record<string, unknown>> = [];
    const prisma = {
        order: {
            findUniqueOrThrow: async () => ({ status: "CANCELLED", payment: { status: "PAID" } })
        },
        fulfillmentJob: {
            updateMany: async () => ({ count: 1 }),
            findUniqueOrThrow: async () => ({ orderId: 7 }),
            update: async ({ data }: { data: Record<string, unknown> }) => {
                updates.push(data);
            }
        },
        $queryRaw: async () => [{ id: 3 }],
        $transaction: async (callback: (tx: Record<string, unknown>) => Promise<unknown>) =>
            callback(prisma)
    };
    const service = new FulfillmentService(prisma as never);
    const testService = service as unknown as {
        processJob(jobId: number, orderUuid: string): Promise<void>;
    };

    await testService.processJob(42, "order-cancelled");

    assert.equal(updates.length, 1);
    assert.equal(updates[0].status, FulfillmentJobStatus.FAILED);
    assert.match(String(updates[0].lastError), /CANCELLED/);
});

test("financial terminal event after claim blocks label purchase", async () => {
    const updates: Array<Record<string, unknown>> = [];
    let shippingCalls = 0;
    let claimWhere: Record<string, unknown> | undefined;
    const prisma = {
        order: {
            findUniqueOrThrow: async () => ({
                status: "PAID",
                payment: { status: "DISPUTED" }
            })
        },
        fulfillmentJob: {
            updateMany: async ({ where }: { where: Record<string, unknown> }) => {
                claimWhere = where;
                return { count: 1 };
            },
            findUniqueOrThrow: async () => ({ orderId: 7 }),
            update: async ({ data }: { data: Record<string, unknown> }) => {
                updates.push(data);
            }
        },
        $queryRaw: async () => [{ id: 3 }],
        $transaction: async (callback: (tx: Record<string, unknown>) => Promise<unknown>) =>
            callback(prisma)
    };
    const service = new FulfillmentService(prisma as never);
    const testService = service as unknown as {
        shippingService: { checkoutOrder(): Promise<unknown> };
        processJob(jobId: number, orderUuid: string): Promise<void>;
    };
    testService.shippingService = {
        checkoutOrder: async () => {
            shippingCalls += 1;
            return { success: true, value: {} };
        }
    };

    await testService.processJob(42, "order-disputed");

    assert.deepStrictEqual(
        (claimWhere?.order as { payment: { is: { status: string } } }).payment.is.status,
        "PAID"
    );
    assert.equal(shippingCalls, 0);
    assert.equal(updates[0].status, FulfillmentJobStatus.FAILED);
    assert.match(String(updates[0].lastError), /DISPUTED/);
});

test("fulfillment stops retrying after configured maximum attempts", async () => {
    const previous = process.env.FULFILLMENT_WORKER_MAX_ATTEMPTS;
    process.env.FULFILLMENT_WORKER_MAX_ATTEMPTS = "2";
    const updates: Array<Record<string, unknown>> = [];
    const prisma = {
        order: {
            findUniqueOrThrow: async () => ({ status: "PAID", payment: { status: "PAID" } })
        },
        fulfillmentJob: {
            updateMany: async ({ data }: { data: Record<string, unknown> }) => {
                if (data.status !== FulfillmentJobStatus.PROCESSING) updates.push(data);
                return { count: 1 };
            },
            findUniqueOrThrow: async ({ select }: { select?: { orderId?: boolean } }) =>
                select?.orderId
                    ? { orderId: 7 }
                    : {
                          attempts: 2,
                          status: FulfillmentJobStatus.PROCESSING,
                          order: { payment: { status: "PAID" } }
                      }
        },
        $queryRaw: async () => [{ id: 3 }],
        $transaction: async (callback: (tx: Record<string, unknown>) => Promise<unknown>) =>
            callback(prisma)
    };
    const service = new FulfillmentService(prisma as never);
    const testService = service as unknown as {
        shippingService: { checkoutOrder(): Promise<{ success: false; value: Error }> };
        processJob(jobId: number, orderUuid: string): Promise<void>;
    };
    testService.shippingService = {
        checkoutOrder: async () => ({ success: false, value: new Error("provider unavailable") })
    };

    try {
        await testService.processJob(42, "order-paid");
    } finally {
        if (previous === undefined) delete process.env.FULFILLMENT_WORKER_MAX_ATTEMPTS;
        else process.env.FULFILLMENT_WORKER_MAX_ATTEMPTS = previous;
    }

    assert.equal(updates.length, 1);
    assert.equal(updates[0].status, FulfillmentJobStatus.FAILED);
    assert.equal(updates[0].lastError, "provider unavailable");
});

test("provider failure cannot resurrect a job stopped by a terminal financial event", async () => {
    let updateManyCalls = 0;
    const prisma = {
        order: {
            findUniqueOrThrow: async () => ({ status: "PAID", payment: { status: "PAID" } })
        },
        fulfillmentJob: {
            updateMany: async () => {
                updateManyCalls += 1;
                return { count: 1 };
            },
            findUniqueOrThrow: async ({ select }: { select?: { orderId?: boolean } }) =>
                select?.orderId
                    ? { orderId: 7 }
                    : {
                          attempts: 1,
                          status: FulfillmentJobStatus.FAILED,
                          order: { payment: { status: "LOST" } }
                      }
        },
        $queryRaw: async () => [{ id: 3 }],
        $transaction: async (callback: (tx: Record<string, unknown>) => Promise<unknown>) =>
            callback(prisma)
    };
    const service = new FulfillmentService(prisma as never);
    const testService = service as unknown as {
        shippingService: { checkoutOrder(): Promise<{ success: false; value: Error }> };
        processJob(jobId: number, orderUuid: string): Promise<void>;
    };
    testService.shippingService = {
        checkoutOrder: async () => ({ success: false, value: new Error("provider unavailable") })
    };

    await testService.processJob(42, "order-lost");

    assert.equal(updateManyCalls, 1);
});

test("fulfillment fails closed before provider call when transaction timeout is unsafe", async () => {
    const previousProviderTimeout = process.env.SUPERFRETE_TIMEOUT_MS;
    const previousTransactionTimeout = process.env.FULFILLMENT_TRANSACTION_TIMEOUT_MS;
    process.env.SUPERFRETE_TIMEOUT_MS = "100";
    process.env.FULFILLMENT_TRANSACTION_TIMEOUT_MS = "10399";
    let transactionCalls = 0;
    let shippingCalls = 0;
    const updates: Array<Record<string, unknown>> = [];
    const prisma = {
        fulfillmentJob: {
            updateMany: async ({ data }: { data: Record<string, unknown> }) => {
                updates.push(data);
                return { count: 1 };
            },
            findUniqueOrThrow: async () => ({
                attempts: 1,
                status: FulfillmentJobStatus.PROCESSING,
                order: { payment: { status: "PAID" } }
            })
        },
        $transaction: async () => {
            transactionCalls += 1;
        }
    };
    const service = new FulfillmentService(prisma as never);
    const testService = service as unknown as {
        shippingService: { checkoutOrder(): Promise<unknown> };
        processJob(jobId: number, orderUuid: string): Promise<void>;
    };
    testService.shippingService = {
        checkoutOrder: async () => {
            shippingCalls += 1;
            return { success: true, value: {} };
        }
    };

    try {
        await testService.processJob(42, "order-paid");
    } finally {
        if (previousProviderTimeout === undefined) delete process.env.SUPERFRETE_TIMEOUT_MS;
        else process.env.SUPERFRETE_TIMEOUT_MS = previousProviderTimeout;
        if (previousTransactionTimeout === undefined) {
            delete process.env.FULFILLMENT_TRANSACTION_TIMEOUT_MS;
        } else {
            process.env.FULFILLMENT_TRANSACTION_TIMEOUT_MS = previousTransactionTimeout;
        }
    }

    assert.equal(transactionCalls, 0);
    assert.equal(shippingCalls, 0);
    assert.equal(updates[1].status, FulfillmentJobStatus.RETRY_SCHEDULED);
    assert.match(String(updates[1].lastError), /deve ser no minimo 10400/);
});

test("fulfillment recovers an expired processing lock and retries the job", async () => {
    const recoveryUpdates: Array<Record<string, unknown>> = [];
    const processed: Array<{ jobId: number; orderUuid: string }> = [];
    const prisma = {
        fulfillmentJob: {
            updateMany: async ({ data }: { data: Record<string, unknown> }) => {
                recoveryUpdates.push(data);
                return { count: 1 };
            },
            findMany: async () => [{ id: 42, order: { uuid: "order-interrupted" } }]
        }
    };
    const service = new FulfillmentService(prisma as never);
    const testService = service as unknown as {
        processJob(jobId: number, orderUuid: string): Promise<void>;
    };
    testService.processJob = async (jobId, orderUuid) => {
        processed.push({ jobId, orderUuid });
    };

    await service.processDue();

    assert.equal(recoveryUpdates[1].status, FulfillmentJobStatus.RETRY_SCHEDULED);
    assert.match(String(recoveryUpdates[1].lastError), /interrompido/);
    assert.deepStrictEqual(processed, [{ jobId: 42, orderUuid: "order-interrupted" }]);
});

test("concurrent fulfillment attempts claim and complete a job only once", async () => {
    const previousProviderTimeout = process.env.SUPERFRETE_TIMEOUT_MS;
    const previousTransactionTimeout = process.env.FULFILLMENT_TRANSACTION_TIMEOUT_MS;
    process.env.SUPERFRETE_TIMEOUT_MS = "100";
    process.env.FULFILLMENT_TRANSACTION_TIMEOUT_MS = "10400";
    const job = {
        id: 42,
        status: FulfillmentJobStatus.PENDING as FulfillmentJobStatus,
        attempts: 0,
        lockedAt: null as Date | null,
        completedAt: null as Date | null
    };
    let shippingCalls = 0;
    let orderTransitions = 0;
    let transactionOptions: { timeout: number } | undefined;
    const sequence: string[] = [];
    const prisma = {
        order: {
            findUniqueOrThrow: async () => {
                sequence.push("financial-read");
                return { status: "PAID", payment: { status: "PAID" } };
            },
            updateMany: async () => {
                orderTransitions += 1;
                return { count: 1 };
            }
        },
        fulfillmentJob: {
            updateMany: async () => {
                if (job.status !== FulfillmentJobStatus.PENDING) return { count: 0 };
                job.status = FulfillmentJobStatus.PROCESSING;
                job.attempts += 1;
                job.lockedAt = new Date();
                return { count: 1 };
            },
            update: async ({ data }: { data: Partial<typeof job> }) => {
                Object.assign(job, data);
                return job;
            },
            findUniqueOrThrow: async ({ select }: { select?: { orderId?: boolean } }) =>
                select?.orderId ? { orderId: 7 } : job
        },
        $queryRaw: async () => {
            sequence.push("payment-lock");
            return [{ id: 3 }];
        },
        $transaction: async (
            callback: (tx: Record<string, unknown>) => Promise<unknown>,
            options: { timeout: number }
        ) => {
            transactionOptions = options;
            return callback(prisma);
        }
    };
    const service = new FulfillmentService(prisma as never);
    const testService = service as unknown as {
        shippingService: { checkoutOrder(): Promise<{ success: true; value: object }> };
        processJob(jobId: number, orderUuid: string): Promise<void>;
    };
    testService.shippingService = {
        checkoutOrder: async () => {
            sequence.push("shipping");
            shippingCalls += 1;
            return { success: true, value: {} };
        }
    };

    try {
        await Promise.all([
            testService.processJob(42, "order-paid"),
            testService.processJob(42, "order-paid")
        ]);
    } finally {
        if (previousProviderTimeout === undefined) delete process.env.SUPERFRETE_TIMEOUT_MS;
        else process.env.SUPERFRETE_TIMEOUT_MS = previousProviderTimeout;
        if (previousTransactionTimeout === undefined) {
            delete process.env.FULFILLMENT_TRANSACTION_TIMEOUT_MS;
        } else {
            process.env.FULFILLMENT_TRANSACTION_TIMEOUT_MS = previousTransactionTimeout;
        }
    }

    assert.deepStrictEqual(transactionOptions, { timeout: 10400 });
    assert.deepStrictEqual(sequence, ["payment-lock", "financial-read", "shipping"]);
    assert.equal(shippingCalls, 1);
    assert.equal(orderTransitions, 1);
    assert.equal(job.attempts, 1);
    assert.equal(job.status, FulfillmentJobStatus.COMPLETED);
    assert.ok(job.completedAt);
});
