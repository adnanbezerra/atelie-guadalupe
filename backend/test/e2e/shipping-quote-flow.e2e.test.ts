import * as assert from "node:assert";
import { test } from "node:test";
import { FastifyInstance } from "fastify";
import { build } from "../helper";

type ApiResponse<T> = {
    success: boolean;
    data: T;
};

function parseResponse<T>(response: { statusCode: number; payload: string }, statusCode: number) {
    assert.equal(response.statusCode, statusCode, response.payload);

    const body = JSON.parse(response.payload) as ApiResponse<T>;
    assert.equal(body.success, true, response.payload);

    return body.data;
}

function authenticatedHeaders(token: string) {
    return {
        authorization: `Bearer ${token}`
    };
}

async function clearCart(app: FastifyInstance, token: string) {
    const response = await app.inject({
        method: "DELETE",
        url: "/cart/items",
        headers: authenticatedHeaders(token)
    });
    const data = parseResponse<{ cart: { items: unknown[] } }>(response, 200);
    assert.deepEqual(data.cart.items, []);
}

test(
    "login, add creams, quote shipping and create a confirmed order",
    { skip: process.env.RUN_E2E !== "true", timeout: 180_000 },
    async (t) => {
        const email = process.env.SEED_ADMIN_EMAIL;
        const password = process.env.SEED_ADMIN_PASSWORD;

        assert.ok(email, "SEED_ADMIN_EMAIL nao configurado");
        assert.ok(password, "SEED_ADMIN_PASSWORD nao configurado");

        const mongoUrl = process.env.MONGODB_URL;
        const mongoDbName = process.env.MONGODB_DB_NAME;
        delete process.env.MONGODB_URL;
        delete process.env.MONGODB_DB_NAME;

        const app = await build(t).finally(() => {
            if (mongoUrl) process.env.MONGODB_URL = mongoUrl;
            if (mongoDbName) process.env.MONGODB_DB_NAME = mongoDbName;
        });

        const loginResponse = await app.inject({
            method: "POST",
            url: "/auth/login",
            payload: { email, password }
        });
        const login = parseResponse<{ token: string }>(loginResponse, 200);
        const headers = authenticatedHeaders(login.token);

        await clearCart(app, login.token);

        const meResponse = await app.inject({ method: "GET", url: "/users/me", headers });
        const me = parseResponse<{
            user: { address: { uuid: string; zipCode: string } | null };
        }>(meResponse, 200);
        assert.ok(me.user.address, "Usuario de teste precisa ter endereco");

        const productResponse = await app.inject({
            method: "GET",
            url: "/products/slug/hidrapele-adulto"
        });
        const product = parseResponse<{ product: { uuid: string } }>(productResponse, 200);

        const add100gResponse = await app.inject({
            method: "POST",
            url: "/cart/items",
            headers,
            payload: {
                productUuid: product.product.uuid,
                productSize: "GRAMS_100",
                quantity: 2
            }
        });
        parseResponse(add100gResponse, 201);

        const add70gResponse = await app.inject({
            method: "POST",
            url: "/cart/items",
            headers,
            payload: {
                productUuid: product.product.uuid,
                productSize: "GRAMS_70",
                quantity: 1
            }
        });
        const cartData = parseResponse<{
            cart: { items: unknown[]; summary: { itemsCount: number } };
        }>(add70gResponse, 201);
        assert.equal(cartData.cart.items.length, 2);
        assert.equal(cartData.cart.summary.itemsCount, 3);

        const quoteResponse = await app.inject({
            method: "POST",
            url: "/shipping/quote",
            payload: {
                zipCode: me.user.address.zipCode.replace(/\D/g, ""),
                items: [
                    {
                        productUuid: product.product.uuid,
                        productSize: "GRAMS_100",
                        quantity: 2
                    },
                    {
                        productUuid: product.product.uuid,
                        productSize: "GRAMS_70",
                        quantity: 1
                    }
                ]
            }
        });
        const quoteData = parseResponse<{
            quotedServices: Array<{ serviceCode: number; priceInCents: number }>;
        }>(quoteResponse, 200);
        assert.ok(quoteData.quotedServices.length > 0);
        assert.ok(quoteData.quotedServices.every((quote) => quote.priceInCents > 0));
        const selectedService = quoteData.quotedServices[0];

        const orderResponse = await app.inject({
            method: "POST",
            url: "/orders",
            headers,
            payload: {
                addressUuid: me.user.address.uuid,
                shipping: {
                    serviceCode: selectedService.serviceCode,
                    priceInCents: selectedService.priceInCents
                },
                paymentMethod: "PIX",
                notes: "Pedido criado pelo teste E2E de cotacao"
            }
        });
        const orderData = parseResponse<{
            order: {
                uuid: string;
                status: string;
                shippingInCents: number;
                totalInCents: number;
                shipment: {
                    status: string;
                    selectedServiceCode: number;
                    packaging: {
                        consolidatedPackage: { weightKg: number };
                    };
                };
            };
        }>(orderResponse, 201);

        assert.equal(orderData.order.status, "AWAITING_PAYMENT");
        assert.equal(orderData.order.shippingInCents, selectedService.priceInCents);
        assert.equal(orderData.order.shipment.status, "CONFIRMED");
        assert.equal(orderData.order.shipment.selectedServiceCode, selectedService.serviceCode);
        assert.equal(orderData.order.shipment.packaging.consolidatedPackage.weightKg, 0.454);

        await clearCart(app, login.token);

        const cartResponse = await app.inject({ method: "GET", url: "/cart", headers });
        const emptyCart = parseResponse<{ cart: { items: unknown[] } }>(cartResponse, 200);
        assert.deepEqual(emptyCart.cart.items, []);

        await app.close();
    }
);
