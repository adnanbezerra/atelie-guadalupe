import * as assert from "node:assert";
import { test } from "node:test";
import { OrderRepository } from "../../../src/modules/orders/repositories/order-repository";

test("conditional cancellation guards both order checkout reference and payment checkout id", async () => {
    let where: Record<string, unknown> | undefined;
    const transactionClient = {
        order: {
            updateMany: async (input: { where: Record<string, unknown> }) => {
                where = input.where;
                return { count: 0 };
            },
            findUniqueOrThrow: async () => {
                throw new Error("cancelled order must not be loaded when transition loses");
            }
        }
    };
    const prisma = {
        $transaction: async (callback: (tx: typeof transactionClient) => Promise<unknown>) =>
            callback(transactionClient)
    };

    const result = await new OrderRepository(prisma as never).cancelIfNoActiveCheckout("order-1");

    assert.equal(result, null);
    assert.equal(where?.checkoutReference, null);
    assert.deepStrictEqual(where?.OR, [
        { payment: { is: null } },
        { payment: { is: { providerCheckoutId: null } } }
    ]);
});
