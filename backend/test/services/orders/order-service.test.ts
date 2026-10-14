import * as assert from "node:assert";
import { test } from "node:test";
import { OrderStatus, PaymentMethod, RoleName } from "../../../src/generated/prisma/enums";
import { OrderService } from "../../../src/modules/orders/services/order-service";

test("order service blocks order creation with empty cart", async () => {
    const userRepository = {
        findByUuid: async () => ({
            id: 1,
            uuid: "user-1",
            name: "Maria",
            email: "maria@example.com",
            document: "12345678901",
            phone: null
        })
    };

    const addressRepository = {
        findByUuid: async () => ({
            id: 8,
            uuid: "address-1",
            userId: 1,
            document: null,
            zipCode: "01001000",
            street: "Praca da Se",
            number: "100",
            complement: null,
            neighborhood: "Se",
            city: "Sao Paulo",
            state: "SP"
        })
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
        marketingRepository as never,
        {} as never
    );

    const result = await service.createFromCart("user-1", {
        addressUuid: "address-1",
        delivery: { type: "SHIPMENT", serviceCode: 1, priceInCents: 1590 }
    });

    assert.equal(result.success, false);
});

test("order service requires CPF or CNPJ only when starting checkout", async () => {
    let shippingCalled = false;
    const service = new OrderService(
        {
            findByUuid: async () => ({
                id: 1,
                uuid: "user-1",
                name: "Maria da Silva",
                email: "maria@example.com",
                document: null,
                phone: null
            })
        } as never,
        {
            findByUuid: async () => ({
                id: 8,
                uuid: "address-1",
                userId: 1,
                document: null,
                zipCode: "01001000",
                street: "Praca da Se",
                number: "100",
                complement: null,
                neighborhood: "Se",
                city: "Sao Paulo",
                state: "SP"
            })
        } as never,
        {
            findByUserId: async () => ({
                id: 10,
                userId: 1,
                items: [{ uuid: "item-1" }]
            })
        } as never,
        {} as never,
        {} as never,
        {
            prepareOrderShipping: async () => {
                shippingCalled = true;
            }
        } as never
    );

    const result = await service.createFromCart("user-1", {
        addressUuid: "address-1",
        delivery: { type: "SHIPMENT", serviceCode: 1, priceInCents: 1590 }
    });

    assert.equal(result.success, false);
    if (!result.success) {
        assert.equal(result.value.message, "Informe um CPF ou CNPJ para continuar o checkout");
    }
    assert.equal(shippingCalled, false);
});

test("order service creates order from cart snapshot", async () => {
    const deletedItems: string[] = [];
    let queuedEmail: unknown;
    let createdShipment: unknown;

    const userRepository = {
        findByUuid: async () => ({
            id: 1,
            uuid: "user-1",
            name: "Maria da Silva",
            email: "maria@example.com",
            document: "12345678901",
            phone: null
        })
    };

    const addressRepository = {
        findByUuid: async () => ({
            id: 8,
            uuid: "address-1",
            userId: 1,
            document: null,
            zipCode: "01001000",
            street: "Praca da Se",
            number: "100",
            complement: null,
            neighborhood: "Se",
            city: "Sao Paulo",
            state: "SP"
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
        createFromCart: async (
            input: Record<string, unknown>,
            cart: { itemUuids: string[] },
            _couponRedemption?: unknown,
            _couponGuard?: unknown,
            checkout?: { shipment: unknown; emailJob: unknown }
        ) => {
            createdShipment = checkout?.shipment;
            queuedEmail = checkout?.emailJob;
            deletedItems.push(...cart.itemUuids);

            return {
                uuid: input.uuid,
                paymentIdempotencyKey: input.paymentIdempotencyKey,
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
                shipment: checkout?.shipment,
                address: {
                    uuid: "address-1",
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
        marketingRepository as never,
        {
            prepareOrderShipping: async () => ({
                success: true,
                value: {
                    shippingInCents: 1590,
                    serviceName: "PAC",
                    shipment: {
                        uuid: "shipment-1",
                        status: "CONFIRMED",
                        selectedServiceCode: 1,
                        selectedServiceName: "PAC",
                        shippingPriceInCents: 1590,
                        quotedAt: new Date(),
                        confirmedAt: new Date()
                    }
                }
            })
        } as never
    );

    const result = await service.createFromCart("user-1", {
        addressUuid: "address-1",
        delivery: { type: "SHIPMENT", serviceCode: 1, priceInCents: 1590 },
        paymentMethod: PaymentMethod.PIX,
        notes: "Entregar em horario comercial"
    });

    assert.equal(result.success, true);

    if (result.success) {
        assert.equal(result.value.order.status, OrderStatus.AWAITING_PAYMENT);
        assert.match(result.value.order.paymentIdempotencyKey, /^[0-9a-f-]{36}$/);
        assert.equal(result.value.order.paymentMethod, PaymentMethod.PIX);
        assert.equal(result.value.order.shippingInCents, 1590);
        assert.equal(result.value.order.totalInCents, 6770);
        assert.equal(result.value.order.items.length, 1);
    }

    assert.deepStrictEqual(deletedItems, ["item-1"]);
    const shipment = createdShipment as Record<string, unknown>;
    assert.equal(shipment.status, "CONFIRMED");
    assert.equal(shipment.selectedServiceCode, 1);
    assert.equal(shipment.selectedServiceName, "PAC");
    assert.equal(shipment.shippingPriceInCents, 1590);
    assert.deepStrictEqual((queuedEmail as { payload: unknown }).payload, {
        customerName: "Maria da Silva",
        orderUuid: (queuedEmail as { deduplicationKey: string }).deduplicationKey.replace(
            "order-created:",
            ""
        ),
        items: [{ name: "Sabonete", quantity: 2, totalInCents: 5180 }],
        subtotalInCents: 5180,
        shippingInCents: 1590,
        shippingServiceName: "PAC",
        discountInCents: 0,
        totalInCents: 6770
    });
});

test("order service creates local pickup without address or shipment", async () => {
    let createdInput: Record<string, unknown> | undefined;
    let createdCheckout: { shipment?: unknown } | undefined;
    let addressLookupCalled = false;
    const pickupLocation = {
        name: "Atelie Guadalupe",
        street: "Rua da Origem",
        number: "123",
        complement: "Fundos",
        neighborhood: "Centro",
        city: "Sao Paulo",
        state: "SP",
        zipCode: "01153000"
    };
    const service = new OrderService(
        {
            findByUuid: async () => ({
                id: 1,
                uuid: "user-1",
                name: "Maria",
                email: "maria@example.com",
                document: null,
                phone: null
            })
        } as never,
        {
            findByUuid: async () => {
                addressLookupCalled = true;
                return null;
            }
        } as never,
        {
            findByUserId: async () => ({
                id: 10,
                userId: 1,
                coupon: null,
                items: [
                    {
                        uuid: "item-1",
                        productSize: "GRAMS_70",
                        quantity: 1,
                        product: {
                            id: 99,
                            name: "Sabonete",
                            imageUrl: null,
                            category: "ARTISANAL",
                            stock: 2,
                            shippingWeightGrams: 100,
                            isActive: true,
                            line: { price70gInCents: 2590, price100gInCents: 3700 }
                        }
                    }
                ]
            })
        } as never,
        {
            createFromCart: async (
                input: Record<string, unknown>,
                _cart: unknown,
                _redemption: unknown,
                _guard: unknown,
                checkout: { shipment?: unknown }
            ) => {
                createdInput = input;
                createdCheckout = checkout;
                return {
                    ...input,
                    id: 20,
                    notes: null,
                    createdAt: new Date(),
                    updatedAt: new Date(),
                    address: null,
                    shipment: null,
                    items: (input.items as Array<Record<string, unknown>>).map((item) => ({
                        ...item,
                        imageUrlSnapshot: null
                    }))
                };
            }
        } as never,
        { findBestActivePromotionForCategory: async () => null } as never,
        { prepareLocalPickup: async () => ({ success: true, value: pickupLocation }) } as never
    );

    const result = await service.createFromCart("user-1", {
        delivery: { type: "LOCAL_PICKUP" }
    });

    assert.equal(result.success, true);
    assert.equal(addressLookupCalled, false);
    assert.equal(createdInput?.shippingInCents, 0);
    assert.equal(createdInput?.addressId, undefined);
    assert.equal(createdInput?.deliveryType, "LOCAL_PICKUP");
    assert.deepEqual(createdInput?.pickupLocationSnapshot, pickupLocation);
    assert.equal(createdCheckout?.shipment, undefined);
    if (result.success) {
        assert.equal(result.value.order.shippingInCents, 0);
        assert.equal(result.value.order.shipment, null);
        assert.deepEqual(result.value.order.delivery, {
            type: "LOCAL_PICKUP",
            location: pickupLocation
        });
    }
});

test("order service rejects fields incompatible with delivery type", async () => {
    const service = new OrderService(
        { findByUuid: async () => ({ id: 1, uuid: "user-1" }) } as never,
        {} as never,
        {} as never,
        {} as never,
        {} as never,
        {} as never
    );

    const pickup = await service.createFromCart("user-1", {
        addressUuid: "address-1",
        delivery: { type: "LOCAL_PICKUP" }
    });
    const shipment = await service.createFromCart("user-1", {
        delivery: { type: "SHIPMENT" }
    });

    assert.equal(pickup.success, false);
    assert.equal(shipment.success, false);
    if (!pickup.success) assert.equal(pickup.value.code, "BUSINESS_RULE_ERROR");
    if (!shipment.success) assert.equal(shipment.value.code, "BUSINESS_RULE_ERROR");
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
        {} as never,
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
        {} as never,
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

test("order service allows admin to read another user's order details", async () => {
    const now = new Date();
    const service = new OrderService(
        { findByUuid: async () => ({ id: 1, uuid: "admin-1" }) } as never,
        {} as never,
        {} as never,
        {
            findByUuid: async () => ({
                uuid: "order-1",
                paymentIdempotencyKey: "payment-key",
                userId: 2,
                status: OrderStatus.PAID,
                subtotalInCents: 1000,
                shippingInCents: 0,
                discountInCents: 0,
                totalInCents: 1000,
                notes: null,
                placedAt: now,
                createdAt: now,
                updatedAt: now,
                items: [],
                payment: null,
                shipment: null
            })
        } as never,
        {} as never,
        {} as never
    );

    const result = await service.detail({ sub: "admin-1", role: RoleName.ADMIN }, "order-1");

    assert.equal(result.success, true);
    if (result.success) assert.equal(result.value.order.uuid, "order-1");
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
        {} as never,
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

test("order service cancels an unpaid order before checkout creation", async () => {
    const now = new Date();
    let cancellationCalled = false;
    const cancelledOrder = {
        uuid: "order-1",
        paymentIdempotencyKey: "0195f4aa-7f18-7db5-9f32-06f4a9a2b401",
        userId: 1,
        status: OrderStatus.CANCELLED,
        subtotalInCents: 1000,
        shippingInCents: 0,
        discountInCents: 0,
        totalInCents: 1000,
        notes: null,
        placedAt: now,
        createdAt: now,
        updatedAt: now,
        items: [],
        payment: null
    };
    const service = new OrderService(
        { findByUuid: async () => ({ id: 1, uuid: "user-1" }) } as never,
        {} as never,
        {} as never,
        {
            findByUuid: async () => ({ ...cancelledOrder, status: OrderStatus.AWAITING_PAYMENT }),
            cancelIfNoActiveCheckout: async () => {
                cancellationCalled = true;
                return cancelledOrder;
            }
        } as never,
        {} as never,
        {} as never
    );

    const result = await service.cancelOwnOrder("user-1", "order-1");

    assert.equal(result.success, true);
    assert.equal(cancellationCalled, true);
    if (result.success) assert.equal(result.value.order.status, OrderStatus.CANCELLED);
});

test("order service blocks cancellation after provider checkout creation", async () => {
    let cancellationCalled = false;
    const service = new OrderService(
        { findByUuid: async () => ({ id: 1, uuid: "user-1" }) } as never,
        {} as never,
        {} as never,
        {
            findByUuid: async () => ({
                userId: 1,
                status: OrderStatus.AWAITING_PAYMENT,
                payment: { providerCheckoutId: "bill_1" }
            }),
            cancelIfNoActiveCheckout: async () => {
                cancellationCalled = true;
            }
        } as never,
        {} as never,
        {} as never
    );

    const result = await service.cancelOwnOrder("user-1", "order-1");

    assert.equal(result.success, false);
    assert.equal(cancellationCalled, false);
});

test("order service reports loss of cancellation race without overwriting payment state", async () => {
    const service = new OrderService(
        { findByUuid: async () => ({ id: 1, uuid: "user-1" }) } as never,
        {} as never,
        {} as never,
        {
            findByUuid: async () => ({
                userId: 1,
                status: OrderStatus.AWAITING_PAYMENT,
                payment: { providerCheckoutId: null }
            }),
            cancelIfNoActiveCheckout: async () => null
        } as never,
        {} as never,
        {} as never
    );

    const result = await service.cancelOwnOrder("user-1", "order-1");

    assert.equal(result.success, false);
});

test("admin status update cannot cancel an order with active checkout", async () => {
    let unconditionalUpdateCalled = false;
    const service = new OrderService(
        {} as never,
        {} as never,
        {} as never,
        {
            findByUuid: async () => ({
                status: OrderStatus.AWAITING_PAYMENT,
                payment: { providerCheckoutId: "bill_1" }
            }),
            updateStatus: async () => {
                unconditionalUpdateCalled = true;
            }
        } as never,
        {} as never,
        {} as never
    );

    const result = await service.updateStatus("order-1", OrderStatus.CANCELLED);

    assert.equal(result.success, false);
    assert.equal(unconditionalUpdateCalled, false);
});

test("admin cancellation uses conditional update and reports a lost checkout race", async () => {
    let unconditionalUpdateCalled = false;
    let conditionalCancellationCalled = false;
    const service = new OrderService(
        {} as never,
        {} as never,
        {} as never,
        {
            findByUuid: async () => ({
                status: OrderStatus.AWAITING_PAYMENT,
                payment: { providerCheckoutId: null }
            }),
            cancelIfNoActiveCheckout: async () => {
                conditionalCancellationCalled = true;
                return null;
            },
            updateStatus: async () => {
                unconditionalUpdateCalled = true;
            }
        } as never,
        {} as never,
        {} as never
    );

    const result = await service.updateStatus("order-1", OrderStatus.CANCELLED);

    assert.equal(result.success, false);
    assert.equal(conditionalCancellationCalled, true);
    assert.equal(unconditionalUpdateCalled, false);
});
