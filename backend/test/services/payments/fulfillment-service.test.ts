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
