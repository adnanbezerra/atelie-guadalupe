import * as assert from "node:assert";
import { test } from "node:test";
import { createOrderSchema } from "../../src/modules/orders/schemas/order-schema";

test("order schema accepts shipment and local pickup payloads", () => {
    const shipment = createOrderSchema.safeParse({
        addressUuid: "0195f4aa-7f18-7db5-9f32-06f4a9a2b301",
        delivery: { type: "SHIPMENT", serviceCode: 1, priceInCents: 3526 }
    });
    const pickup = createOrderSchema.safeParse({
        delivery: { type: "LOCAL_PICKUP" }
    });

    assert.equal(shipment.success, true);
    assert.equal(pickup.success, true);
});

test("order schema rejects malformed delivery payloads", () => {
    assert.equal(createOrderSchema.safeParse({ delivery: { type: "INVALID" } }).success, false);
    assert.equal(
        createOrderSchema.safeParse({
            delivery: { type: "SHIPMENT", serviceCode: 0, priceInCents: -1 }
        }).success,
        false
    );
});
