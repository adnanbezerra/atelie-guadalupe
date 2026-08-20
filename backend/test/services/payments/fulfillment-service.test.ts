import * as assert from "node:assert";
import { test } from "node:test";
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
