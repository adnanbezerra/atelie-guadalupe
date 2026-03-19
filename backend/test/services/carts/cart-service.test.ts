import * as assert from "node:assert";
import { test } from "node:test";
import { CartService } from "../../../src/modules/carts/services/cart-service";

test("cart service creates cart on first read", async () => {
    const userRepository = {
        findByUuid: async () => ({
            id: 1,
            uuid: "user-1"
        })
    };

    const productRepository = {};
    const cartRepository = {
        findByUserId: async () => null,
        create: async (input: Record<string, unknown>) => ({
            id: 10,
            uuid: input.uuid,
            userId: input.userId,
            items: []
        })
    };

    const service = new CartService(
        userRepository as never,
        productRepository as never,
        cartRepository as never
    );
    const result = await service.getMyCart("user-1");

    assert.equal(result.success, true);
    if (result.success) {
        assert.equal(result.value.cart.summary.itemsCount, 0);
        assert.equal(result.value.cart.summary.subtotalInCents, 0);
    }
});

test("cart service blocks quantity above stock", async () => {
    const userRepository = {
        findByUuid: async () => ({
            id: 1,
            uuid: "user-1"
        })
    };

    const productRepository = {
        findByUuid: async () => ({
            id: 2,
            uuid: "product-1",
            name: "Sabonete",
            imageUrl: "https://cdn.exemplo.com/lavanda.jpg",
            stock: 1,
            isActive: true,
            line: {
                pricePerGramInCents: 37
            }
        })
    };

    const cartRepository = {
        findByUserId: async () => ({
            id: 10,
            uuid: "cart-1",
            userId: 1,
            items: []
        }),
        findItemByCartAndProduct: async () => null
    };

    const service = new CartService(
        userRepository as never,
        productRepository as never,
        cartRepository as never
    );
    const result = await service.addItem("user-1", {
        productUuid: "product-1",
        productSize: "GRAMS_70",
        quantity: 2
    });

    assert.equal(result.success, false);
});

test("cart service increments quantity when product already exists in cart", async () => {
    const updates: Array<Record<string, unknown>> = [];

    const userRepository = {
        findByUuid: async () => ({
            id: 1,
            uuid: "user-1"
        })
    };

    const productRepository = {
        findByUuid: async () => ({
            id: 2,
            uuid: "product-1",
            name: "Sabonete",
            imageUrl: "https://cdn.exemplo.com/lavanda.jpg",
            stock: 10,
            isActive: true,
            line: {
                pricePerGramInCents: 37
            }
        })
    };

    let cartReads = 0;
    const cartRepository = {
        findByUserId: async () => {
            cartReads += 1;

            if (cartReads === 1) {
                return {
                    id: 10,
                    uuid: "cart-1",
                    userId: 1,
                    items: []
                };
            }

            return {
                id: 10,
                uuid: "cart-1",
                userId: 1,
                items: [
                    {
                        uuid: "item-1",
                        productSize: "GRAMS_70",
                        quantity: 3,
                        unitPriceInCents: 2590,
                        productNameSnapshot: "Sabonete",
                        product: {
                            uuid: "product-1",
                            imageUrl: "https://cdn.exemplo.com/lavanda.jpg",
                            stock: 10,
                            isActive: true
                        }
                    }
                ]
            };
        },
        findItemByCartAndProduct: async () => ({
            uuid: "item-1",
            quantity: 1,
            product: {
                stock: 10
            }
        }),
        updateItemByUuid: async (uuid: string, input: Record<string, unknown>) => {
            updates.push({
                uuid,
                ...input
            });
            return null;
        }
    };

    const service = new CartService(
        userRepository as never,
        productRepository as never,
        cartRepository as never
    );
    const result = await service.addItem("user-1", {
        productUuid: "product-1",
        productSize: "GRAMS_70",
        quantity: 2
    });

    assert.equal(result.success, true);
    assert.equal(updates.length, 1);
    assert.equal(updates[0].quantity, 3);
});
