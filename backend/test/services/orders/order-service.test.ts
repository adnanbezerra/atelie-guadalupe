import * as assert from "node:assert";
import { test } from "node:test";
import { OrderStatus, RoleName } from "../../../src/generated/prisma/enums";
import { OrderService } from "../../../src/modules/orders/services/order-service";

test("order service blocks order creation with empty cart", async () => {
    const userRepository = {
        findByUuid: async () => ({
            id: 1,
            uuid: "user-1"
        })
    };

    const addressRepository = {
        findByUuid: async () => null
    };

    const cartRepository = {
        findByUserId: async () => ({
            id: 10,
            userId: 1,
            items: []
        })
    };

    const orderRepository = {};

    const service = new OrderService(
        userRepository as never,
        addressRepository as never,
        cartRepository as never,
        orderRepository as never
    );

    const result = await service.createFromCart("user-1", {});

    assert.equal(result.success, false);
});

test("order service creates order from cart snapshot", async () => {
    const deletedItems: string[] = [];

    const userRepository = {
        findByUuid: async () => ({
            id: 1,
            uuid: "user-1"
        })
    };

    const addressRepository = {
        findByUuid: async () => ({
            id: 8,
            uuid: "address-1",
            userId: 1
        })
    };

    const cartRepository = {
        findByUserId: async () => ({
            id: 10,
            userId: 1,
            items: [
                {
                    uuid: "item-1",
                    productSize: "GRAMS_70",
                    quantity: 2,
                    unitPriceInCents: 2590,
                    product: {
                        id: 99,
                        name: "Sabonete",
                        imageUrl: "https://cdn.exemplo.com/sabonete.jpg",
                        stock: 5,
                        isActive: true
                    }
                }
            ]
        }),
        deleteItemByUuid: async (uuid: string) => {
            deletedItems.push(uuid);
        }
    };

    const orderRepository = {
        create: async (input: Record<string, unknown>) => ({
            uuid: input.uuid,
            status: input.status,
            subtotalInCents: input.subtotalInCents,
            shippingInCents: input.shippingInCents,
            discountInCents: input.discountInCents,
            totalInCents: input.totalInCents,
            notes: input.notes,
            placedAt: input.placedAt,
            createdAt: new Date(),
            updatedAt: new Date(),
            address: {
                uuid: "address-1",
                recipient: "Maria",
                zipCode: "01001000",
                street: "Praca da Se",
                number: "100",
                complement: null,
                neighborhood: "Se",
                city: "Sao Paulo",
                state: "SP",
                country: "Brasil"
            },
            items: [
                {
                    uuid: "order-item-1",
                    productSize: "GRAMS_70",
                    productNameSnapshot: "Sabonete",
                    imageUrlSnapshot: "https://cdn.exemplo.com/sabonete.jpg",
                    quantity: 2,
                    unitPriceInCents: 2590,
                    totalPriceInCents: 5180
                }
            ]
        })
    };

    const service = new OrderService(
        userRepository as never,
        addressRepository as never,
        cartRepository as never,
        orderRepository as never
    );

    const result = await service.createFromCart("user-1", {
        addressUuid: "address-1",
        notes: "Entregar em horario comercial"
    });

    assert.equal(result.success, true);

    if (result.success) {
        assert.equal(result.value.order.status, OrderStatus.PENDING);
        assert.equal(result.value.order.totalInCents, 5180);
        assert.equal(result.value.order.items.length, 1);
    }

    assert.deepStrictEqual(deletedItems, ["item-1"]);
});

test("order service prevents invalid status transition", async () => {
    const service = new OrderService(
        {} as never,
        {} as never,
        {} as never,
        {
            findByUuid: async () => ({
                uuid: "order-1",
                userId: 1,
                status: OrderStatus.DELIVERED
            })
        } as never
    );

    const result = await service.updateStatus("order-1", OrderStatus.PAID);

    assert.equal(result.success, false);
});

test("order service restricts detail to order owner for USER role", async () => {
    const service = new OrderService(
        {
            findByUuid: async () => ({
                id: 1,
                uuid: "user-1"
            })
        } as never,
        {} as never,
        {} as never,
        {
            findByUuid: async () => ({
                uuid: "order-1",
                userId: 2,
                status: OrderStatus.PENDING
            })
        } as never
    );

    const result = await service.detail(
        {
            sub: "user-1",
            role: RoleName.USER
        },
        "order-1"
    );

    assert.equal(result.success, false);
});
