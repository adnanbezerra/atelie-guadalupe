import * as assert from "node:assert";
import { createHmac } from "node:crypto";
import { test } from "node:test";
import { FastifyInstance } from "fastify";
import { build } from "../helper";

type ApiResponse<T> = {
    success: boolean;
    data: T;
};

type OrderResponse = {
    order: {
        uuid: string;
        paymentIdempotencyKey: string;
        status: string;
        totalInCents: number;
        payment: null | {
            status: string;
            providerCheckoutId: string | null;
            checkoutUrl: string | null;
        };
        shipment: null | {
            status: string;
            superfreteProtocol: string | null;
            trackingCode: string | null;
            labelUrl: string | null;
        };
        fulfillment: null | {
            status: string;
            attempts: number;
            lastError: string | null;
        };
    };
};

function parseResponse<T>(response: { statusCode: number; payload: string }, statusCode: number) {
    assert.equal(response.statusCode, statusCode, response.payload);
    const body = JSON.parse(response.payload) as ApiResponse<T>;
    assert.equal(body.success, true, response.payload);
    return body.data;
}

function authenticatedHeaders(token: string) {
    return { authorization: `Bearer ${token}` };
}

async function clearCart(app: FastifyInstance, token: string) {
    const response = await app.inject({
        method: "DELETE",
        url: "/cart/items",
        headers: authenticatedHeaders(token)
    });
    parseResponse(response, 200);
}

async function getProviderCheckout(checkoutId: string, apiKey: string) {
    const baseUrl = process.env.ABACATEPAY_BASE_URL ?? "https://api.abacatepay.com/v2";
    const response = await fetch(`${baseUrl}/checkouts/list`, {
        headers: { Authorization: `Bearer ${apiKey}` }
    });
    assert.equal(response.status, 200, await response.text());
    const payload = (await response.json()) as {
        success: boolean;
        data: Array<{
            id: string;
            externalId: string;
            amount: number;
            devMode: boolean;
        }>;
    };
    assert.equal(payload.success, true);
    return payload.data.find((checkout) => checkout.id === checkoutId) ?? null;
}

const requiredEnvironment = [
    "DATABASE_URL",
    "SEED_ADMIN_EMAIL",
    "SEED_ADMIN_PASSWORD",
    "ABACATEPAY_API_KEY",
    "ABACATEPAY_WEBHOOK_SECRET",
    "ABACATEPAY_WEBHOOK_HMAC_KEY",
    "SUPERFRETE_TOKEN",
    "SUPERFRETE_USER_AGENT"
];
const missingEnvironment = requiredEnvironment.filter((name) => !process.env[name]);
const enabled = process.env.RUN_CHECKOUT_E2E === "true";
const skipReason = !enabled
    ? "Defina RUN_CHECKOUT_E2E=true para executar integracoes sandbox"
    : missingEnvironment.length > 0
      ? `Variaveis ausentes: ${missingEnvironment.join(", ")}`
      : false;

test(
    "checkout sandbox: pedido, frete, AbacatePay, webhook e etiqueta Superfrete",
    { skip: skipReason, timeout: 240_000 },
    async (t) => {
        const superFreteBaseUrl =
            process.env.SUPERFRETE_BASE_URL ?? "https://sandbox.superfrete.com/api/v0";
        assert.match(
            superFreteBaseUrl,
            /^https:\/\/sandbox\.superfrete\.com\/api\/v0\/?$/,
            "O E2E recusa SUPERFRETE_BASE_URL de producao"
        );
        process.env.SUPERFRETE_BASE_URL = superFreteBaseUrl.replace(/\/$/, "");
        process.env.FULFILLMENT_WORKER_ENABLED = "false";

        const email = process.env.SEED_ADMIN_EMAIL!;
        const password = process.env.SEED_ADMIN_PASSWORD!;
        const abacateApiKey = process.env.ABACATEPAY_API_KEY!;
        const webhookSecret = process.env.ABACATEPAY_WEBHOOK_SECRET!;
        const webhookHmacKey = process.env.ABACATEPAY_WEBHOOK_HMAC_KEY!;

        const mongoUrl = process.env.MONGODB_URL;
        const mongoDbName = process.env.MONGODB_DB_NAME;
        delete process.env.MONGODB_URL;
        delete process.env.MONGODB_DB_NAME;

        const app = await build(t).finally(() => {
            if (mongoUrl) process.env.MONGODB_URL = mongoUrl;
            if (mongoDbName) process.env.MONGODB_DB_NAME = mongoDbName;
        });

        const login = parseResponse<{ token: string }>(
            await app.inject({
                method: "POST",
                url: "/auth/login",
                payload: { email, password }
            }),
            200
        );
        const headers = authenticatedHeaders(login.token);
        await clearCart(app, login.token);

        const me = parseResponse<{ user: { address: { uuid: string } | null } }>(
            await app.inject({ method: "GET", url: "/users/me", headers }),
            200
        );
        assert.ok(me.user.address, "Usuario E2E precisa ter endereco completo");

        const product = parseResponse<{ product: { uuid: string } }>(
            await app.inject({ method: "GET", url: "/products/slug/hidrapele-adulto" }),
            200
        );
        await app
            .inject({
                method: "POST",
                url: "/cart/items",
                headers,
                payload: {
                    productUuid: product.product.uuid,
                    productSize: "GRAMS_70",
                    quantity: 1
                }
            })
            .then((response: { statusCode: number; payload: string }) =>
                parseResponse(response, 201)
            );

        const preview = parseResponse<{
            quotedServices: Array<{ serviceCode: number; priceInCents: number }>;
        }>(
            await app.inject({
                method: "POST",
                url: "/shipping/quote",
                payload: {
                    zipCode: "01001000",
                    items: [
                        {
                            productUuid: product.product.uuid,
                            productSize: "GRAMS_70",
                            quantity: 1
                        }
                    ]
                }
            }),
            200
        );
        assert.ok(preview.quotedServices.length > 0);

        const created = parseResponse<OrderResponse>(
            await app.inject({
                method: "POST",
                url: "/orders",
                headers,
                payload: {
                    addressUuid: me.user.address.uuid,
                    paymentMethod: "PIX",
                    notes: "Fluxo completo sandbox"
                }
            }),
            201
        );
        assert.match(created.order.paymentIdempotencyKey, /^[0-9a-f-]{36}$/);

        const quoted = parseResponse<{
            shipment: {
                quotedServices: Array<{ serviceCode: number; priceInCents: number }>;
            };
        }>(
            await app.inject({
                method: "POST",
                url: `/shipping/orders/${created.order.uuid}/quote`,
                headers,
                payload: { refresh: true }
            }),
            200
        );
        const selectedService = quoted.shipment.quotedServices[0];
        assert.ok(selectedService);

        const confirmed = parseResponse<{
            shipment: { status: string; selectedServiceCode: number };
            orderTotals: { totalInCents: number; shippingInCents: number };
        }>(
            await app.inject({
                method: "POST",
                url: `/shipping/orders/${created.order.uuid}/quote`,
                headers,
                payload: { serviceCode: selectedService.serviceCode }
            }),
            200
        );
        assert.equal(confirmed.shipment.status, "CONFIRMED");
        assert.equal(confirmed.orderTotals.shippingInCents, selectedService.priceInCents);

        const paymentHeaders = {
            ...headers,
            "idempotency-key": created.order.paymentIdempotencyKey
        };
        const checkout = parseResponse<{
            paymentStatus: string;
            checkoutId: string;
            checkoutUrl: string;
            amountInCents: number;
        }>(
            await app.inject({
                method: "POST",
                url: `/orders/${created.order.uuid}/payment`,
                headers: paymentHeaders
            }),
            200
        );
        assert.equal(checkout.paymentStatus, "PENDING");
        assert.equal(checkout.amountInCents, confirmed.orderTotals.totalInCents);

        const repeatedCheckout = parseResponse<typeof checkout>(
            await app.inject({
                method: "POST",
                url: `/orders/${created.order.uuid}/payment`,
                headers: paymentHeaders
            }),
            200
        );
        assert.equal(repeatedCheckout.checkoutId, checkout.checkoutId);
        assert.equal(repeatedCheckout.checkoutUrl, checkout.checkoutUrl);

        const providerCheckout = await getProviderCheckout(checkout.checkoutId, abacateApiKey);
        assert.ok(providerCheckout, "Checkout nao encontrado na AbacatePay");
        assert.equal(providerCheckout.externalId, created.order.uuid);
        assert.equal(providerCheckout.amount, checkout.amountInCents);
        assert.equal(
            providerCheckout.devMode,
            true,
            "O E2E recusa confirmar artificialmente um checkout fora do devMode"
        );

        const event = {
            id: `log_e2e_${created.order.uuid.replaceAll("-", "")}`,
            event: "checkout.completed",
            apiVersion: 2,
            devMode: true,
            data: {
                checkout: {
                    id: checkout.checkoutId,
                    externalId: created.order.uuid,
                    amount: checkout.amountInCents,
                    paidAmount: checkout.amountInCents
                },
                payerInformation: { method: "PIX" }
            }
        };
        const rawBody = JSON.stringify(event);
        const signature = createHmac("sha256", webhookHmacKey)
            .update(Buffer.from(rawBody))
            .digest("base64");
        const webhookRequest = {
            method: "POST" as const,
            url: `/webhooks/abacatepay?webhookSecret=${encodeURIComponent(webhookSecret)}`,
            headers: {
                "content-type": "application/json",
                "x-webhook-signature": signature
            },
            payload: rawBody
        };
        parseResponse(await app.inject(webhookRequest), 200);
        const duplicate = parseResponse<{ duplicate: boolean }>(
            await app.inject(webhookRequest),
            200
        );
        assert.equal(duplicate.duplicate, true);

        const paid = parseResponse<OrderResponse>(
            await app.inject({
                method: "GET",
                url: `/orders/${created.order.uuid}`,
                headers
            }),
            200
        );
        assert.equal(paid.order.status, "PAID");
        assert.equal(paid.order.payment?.status, "PAID");
        assert.equal(paid.order.fulfillment?.status, "PENDING");

        parseResponse(
            await app.inject({
                method: "POST",
                url: `/orders/${created.order.uuid}/fulfillment/retry`,
                headers
            }),
            200
        );

        const fulfilled = parseResponse<OrderResponse>(
            await app.inject({
                method: "GET",
                url: `/orders/${created.order.uuid}`,
                headers
            }),
            200
        );
        assert.equal(
            fulfilled.order.fulfillment?.status,
            "COMPLETED",
            fulfilled.order.fulfillment?.lastError ?? "Fulfillment nao concluido"
        );
        assert.equal(fulfilled.order.status, "PROCESSING");
        assert.equal(fulfilled.order.shipment?.status, "LABEL_PURCHASED");
        assert.ok(
            fulfilled.order.shipment?.superfreteProtocol ||
                fulfilled.order.shipment?.trackingCode ||
                fulfilled.order.shipment?.labelUrl,
            "Superfrete nao retornou protocolo, rastreio nem etiqueta"
        );
    }
);
