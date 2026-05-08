import * as assert from "node:assert";
import { test } from "node:test";
import { OrderStatus, PaymentMethod, RoleName } from "../../../src/generated/prisma/enums";
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
    const marketingRepository = {};

    const service = new OrderService(
        userRepository as never,
        addressRepository as never,
        cartRepository as never,
        orderRepository as never,
        marketingRepository as never
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
            coupon: null,
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
                        category: "ARTISANAL",
                        stock: 5,
                        isActive: true,
                        line: {
                            price70gInCents: 2590,
                            price100gInCents: 3700
                        }
                    }
                }
            ]
        }),
        deleteItemByUuid: async (uuid: string) => {
            deletedItems.push(uuid);
        },
        updateCoupon: async () => {
            return null;
        }
    };
    const marketingRepository = {
        findBestActivePromotionForCategory: async () => null
    };

    const orderRepository = {
        createFromCart: async (input: Record<string, unknown>, cart: { itemUuids: string[] }) => {
            deletedItems.push(...cart.itemUuids);

            return {
                uuid: input.uuid,
                id: 20,
                status: input.status,
                subtotalInCents: input.subtotalInCents,
                shippingInCents: input.shippingInCents,
                discountInCents: input.discountInCents,
                totalInCents: input.totalInCents,
                notes: input.notes,
                placedAt: input.placedAt,
                paymentMethod: input.paymentMethod,
                createdAt: new Date(),
                updatedAt: new Date(),
                address: {
                    uuid: "address-1",
                    recipient: "Maria",
                    zipCode: "01001000",
                    street: "Praca da Se",
                    number: "100",
                    apartmentNumber: "42",
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
            };
        }
    };

    const service = new OrderService(
        userRepository as never,
        addressRepository as never,
        cartRepository as never,
        orderRepository as never,
        marketingRepository as never
    );

    const result = await service.createFromCart("user-1", {
        addressUuid: "address-1",
        paymentMethod: PaymentMethod.PIX,
        notes: "Entregar em horario comercial"
    });

    assert.equal(result.success, true);

    if (result.success) {
        assert.equal(result.value.order.status, OrderStatus.PENDING);
        assert.equal(result.value.order.paymentMethod, PaymentMethod.PIX);
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
        } as never,
        {} as never
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
        } as never,
        {} as never
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

test("order service lists current user orders with pagination", async () => {
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
            listByUserIdPaginated: async (_userId: number, page: number, pageSize: number) => ({
                orders: [
                    {
                        uuid: "order-1",
                        status: OrderStatus.PENDING,
                        subtotalInCents: 1000,
                        shippingInCents: 0,
                        discountInCents: 0,
                        totalInCents: 1000,
                        paymentMethod: PaymentMethod.CREDIT_CARD,
                        notes: null,
                        placedAt: new Date(),
                        createdAt: new Date(),
                        updatedAt: new Date(),
                        address: null,
                        items: []
                    }
                ],
                total: 11,
                page,
                pageSize
            })
        } as never,
        {} as never
    );

    const result = await service.listMine("user-1", {
        page: 2,
        pageSize: 5
    });

    assert.equal(result.success, true);

    if (result.success) {
        assert.equal(result.value.orders.length, 1);
        assert.equal(result.value.orders[0].paymentMethod, PaymentMethod.CREDIT_CARD);
        assert.deepStrictEqual(result.value.pagination, {
            page: 2,
            pageSize: 5,
            total: 11,
            totalPages: 3
        });
    }
});
