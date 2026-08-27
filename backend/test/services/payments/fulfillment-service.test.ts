import * as assert from "node:assert";
import { test } from "node:test";
import { FulfillmentJobStatus } from "../../../src/generated/prisma/enums";
import { FulfillmentService } from "../../../src/modules/payments/services/fulfillment-service";

test("fulfillment retry processes the requested order job", async () => {
    const processed: Array<{ jobId: number; orderUuid: string }> = [];
    const prisma = {
        order: {
            findUnique: async () => ({ id: 7, uuid: "order-requested" })
        },
        fulfillmentJob: {
            upsert: async () => ({ id: 42 }),
            update: async () => ({ id: 42 })
        }
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

test("fulfillment marks a cancelled order as terminal failure without retry", async () => {
    const updates: Array<Record<string, unknown>> = [];
    const prisma = {
        order: {
            findUniqueOrThrow: async () => ({ status: "CANCELLED" })
        },
        fulfillmentJob: {
            updateMany: async () => ({ count: 1 }),
            update: async ({ data }: { data: Record<string, unknown> }) => {
                updates.push(data);
            }
        }
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

test("fulfillment stops retrying after configured maximum attempts", async () => {
    const previous = process.env.FULFILLMENT_WORKER_MAX_ATTEMPTS;
    process.env.FULFILLMENT_WORKER_MAX_ATTEMPTS = "2";
    const updates: Array<Record<string, unknown>> = [];
    const prisma = {
        order: {
            findUniqueOrThrow: async () => ({ status: "PAID" })
        },
        fulfillmentJob: {
            updateMany: async () => ({ count: 1 }),
            findUniqueOrThrow: async () => ({ attempts: 2 }),
            update: async ({ data }: { data: Record<string, unknown> }) => {
                updates.push(data);
            }
        }
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

test("fulfillment recovers an expired processing lock and retries the job", async () => {
    const recoveryUpdates: Array<Record<string, unknown>> = [];
    const processed: Array<{ jobId: number; orderUuid: string }> = [];
    const prisma = {
        fulfillmentJob: {
            updateMany: async ({ data }: { data: Record<string, unknown> }) => {
                recoveryUpdates.push(data);
                return { count: 1 };
            },
            findMany: async () => [
                { id: 42, order: { uuid: "order-interrupted" } }
            ]
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
    const job = {
        id: 42,
        status: FulfillmentJobStatus.PENDING as FulfillmentJobStatus,
        attempts: 0,
        lockedAt: null as Date | null,
        completedAt: null as Date | null
    };
    let shippingCalls = 0;
    let orderTransitions = 0;
    const prisma = {
        order: {
            findUniqueOrThrow: async () => ({ status: "PAID" }),
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
            findUniqueOrThrow: async () => job
        },
        $transaction: async (operations: Promise<unknown>[]) => Promise.all(operations)
    };
    const service = new FulfillmentService(prisma as never);
    const testService = service as unknown as {
        shippingService: { checkoutOrder(): Promise<{ success: true; value: object }> };
        processJob(jobId: number, orderUuid: string): Promise<void>;
    };
    testService.shippingService = {
        checkoutOrder: async () => {
            shippingCalls += 1;
            return { success: true, value: {} };
        }
    };

    await Promise.all([
        testService.processJob(42, "order-paid"),
        testService.processJob(42, "order-paid")
    ]);

    assert.equal(shippingCalls, 1);
    assert.equal(orderTransitions, 1);
    assert.equal(job.attempts, 1);
    assert.equal(job.status, FulfillmentJobStatus.COMPLETED);
    assert.ok(job.completedAt);
});
