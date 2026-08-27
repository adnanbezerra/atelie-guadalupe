import * as assert from "node:assert";
import { execFileSync } from "node:child_process";
import { createHmac } from "node:crypto";
import { test } from "node:test";
import { FastifyInstance } from "fastify";
import { ABACATEPAY_WEBHOOK_PUBLIC_KEY } from "../../src/modules/payments/services/payment-webhook-service";
import { build } from "../helper";
import { assertCheckoutE2eSafety, checkoutE2eSkipReason } from "./checkout-e2e-guard";

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
            selectedServiceCode: number | null;
            selectedServiceName: string | null;
            shippingPriceInCents: number | null;
            superfreteProtocol: string | null;
            superfreteOrderId: string | null;
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
    const rawBody = await response.text();
    assert.equal(response.status, 200, rawBody);
    const payload = JSON.parse(rawBody) as {
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

const enabled = process.env.RUN_CHECKOUT_E2E === "true";
const skipReason = checkoutE2eSkipReason(enabled);

test(
    "checkout sandbox: pedido, frete, AbacatePay, webhook e etiqueta Superfrete",
    { skip: skipReason, timeout: 240_000 },
    async (t) => {
        const { superFreteBaseUrl } = assertCheckoutE2eSafety(process.env);
        const startedAt = Date.now();
        process.env.SUPERFRETE_BASE_URL = superFreteBaseUrl;
        process.env.FULFILLMENT_WORKER_ENABLED = "false";
        process.env.EMAIL_WORKER_ENABLED = "false";

        const email = process.env.SEED_ADMIN_EMAIL!;
        const password = process.env.SEED_ADMIN_PASSWORD!;
        const document = process.env.SEED_ADMIN_DOCUMENT!;
        const abacateApiKey = process.env.ABACATEPAY_API_KEY!;
        const webhookSecret = process.env.ABACATEPAY_WEBHOOK_SECRET!;

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
        parseResponse(
            await app.inject({
                method: "PATCH",
                url: "/users/me",
                headers,
                payload: {
                    document,
                    address: {
                        uuid: me.user.address.uuid,
                        document
                    }
                }
            }),
            200
        );

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
        const selectedService = preview.quotedServices[0];
        assert.ok(selectedService);

        const created = parseResponse<OrderResponse>(
            await app.inject({
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
                    notes: "Fluxo completo sandbox"
                }
            }),
            201
        );
        assert.match(created.order.paymentIdempotencyKey, /^[0-9a-f-]{36}$/);
        assert.equal(created.order.status, "AWAITING_PAYMENT");
        assert.equal(created.order.shipment?.status, "CONFIRMED");
        assert.equal(created.order.shipment?.selectedServiceCode, selectedService.serviceCode);
        assert.equal(created.order.shipment?.shippingPriceInCents, selectedService.priceInCents);

        const orderReceivedEmail = await app.prisma.emailJob.findUniqueOrThrow({
            where: { deduplicationKey: `order-created:${created.order.uuid}` }
        });
        const orderReceivedPayload = orderReceivedEmail.payload as {
            customerName: string;
            orderUuid: string;
            items: unknown[];
            subtotalInCents: number;
            shippingInCents: number;
            shippingServiceName: string;
            discountInCents: number;
            totalInCents: number;
        };
        assert.equal(orderReceivedPayload.orderUuid, created.order.uuid);
        assert.ok(orderReceivedPayload.customerName);
        assert.ok(orderReceivedPayload.items.length > 0);
        assert.ok(orderReceivedPayload.shippingServiceName);
        assert.equal(
            orderReceivedPayload.shippingInCents,
            created.order.shipment?.shippingPriceInCents
        );
        assert.equal(orderReceivedPayload.totalInCents, created.order.totalInCents);

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
        assert.equal(checkout.amountInCents, created.order.totalInCents);

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
        const signature = createHmac("sha256", ABACATEPAY_WEBHOOK_PUBLIC_KEY)
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
        const persistedOrder = await app.prisma.order.findUniqueOrThrow({
            where: { uuid: created.order.uuid },
            select: { id: true }
        });
        assert.equal(
            await app.prisma.fulfillmentJob.count({ where: { orderId: persistedOrder.id } }),
            1
        );
        assert.equal(
            await app.prisma.emailJob.count({
                where: { deduplicationKey: `payment-paid:${created.order.uuid}` }
            }),
            1
        );
        assert.equal(
            await app.prisma.emailJob.count({
                where: { deduplicationKey: `order-created:${created.order.uuid}` }
            }),
            1
        );

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
        assert.equal(fulfilled.order.fulfillment?.attempts, 1);
        assert.equal(
            await app.prisma.orderShipment.count({
                where: {
                    orderId: persistedOrder.id,
                    status: "LABEL_PURCHASED",
                    superfreteOrderId: { not: null }
                }
            }),
            1
        );
        assert.ok(
            fulfilled.order.shipment?.superfreteProtocol ||
                fulfilled.order.shipment?.trackingCode ||
                fulfilled.order.shipment?.labelUrl,
            "Superfrete nao retornou protocolo, rastreio nem etiqueta"
        );
        console.log(
            JSON.stringify({
                evidence: "checkout-e2e-sandbox",
                executedAt: new Date().toISOString(),
                commit:
                    process.env.GITHUB_SHA ??
                    process.env.CI_COMMIT_SHA ??
                    execFileSync("git", ["rev-parse", "--short", "HEAD"], {
                        encoding: "utf8"
                    }).trim(),
                environment: "sandbox",
                durationMs: Date.now() - startedAt,
                devMode: providerCheckout.devMode,
                orderUuid: created.order.uuid,
                abacateCheckoutId: checkout.checkoutId,
                superfreteOrderId: fulfilled.order.shipment?.superfreteOrderId,
                fulfillmentAttempts: fulfilled.order.fulfillment?.attempts,
                fulfillmentCount: 1,
                paymentConfirmedEmailCount: 1
            })
        );
    }
);
