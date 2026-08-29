import "dotenv/config";
import { performance } from "node:perf_hooks";
import { PrismaPg } from "@prisma/adapter-pg";
import { Prisma, PrismaClient } from "../generated/prisma/client";
import {
    evaluateProductionSmoke,
    manualProductionSmokeChecks,
    ProductionSmokeInputs,
    ProductionSmokeSnapshot,
    productionSmokeDatabaseUrl,
    readProductionSmokeInputs
} from "./production-smoke-safety";

type JsonProof = {
    matches: boolean;
};

async function readSnapshot(
    transaction: Prisma.TransactionClient,
    input: ProductionSmokeInputs
): Promise<ProductionSmokeSnapshot> {
    const order = await transaction.order.findUnique({
        where: { uuid: input.orderUuid },
        select: {
            id: true,
            status: true,
            totalInCents: true,
            checkoutProvider: true,
            checkoutReference: true,
            createdAt: true,
            user: { select: { uuid: true, isActive: true } },
            payment: {
                select: {
                    id: true,
                    provider: true,
                    status: true,
                    providerMethod: true,
                    providerCheckoutId: true,
                    expectedAmountInCents: true,
                    paidAmountInCents: true,
                    paidAt: true
                }
            },
            fulfillmentJob: {
                select: { status: true, createdAt: true, completedAt: true }
            },
            shipment: {
                select: {
                    status: true,
                    superfreteOrderId: true,
                    purchasedAt: true
                }
            }
        }
    });
    const webhook = await transaction.paymentWebhookEvent.findUnique({
        where: { eventId: input.webhookEventId },
        select: {
            id: true,
            provider: true,
            eventType: true,
            processedAt: true,
            error: true,
            createdAt: true
        }
    });

    let paymentProviderProofMatches = false;
    if (order?.payment) {
        const proof = await transaction.$queryRaw<JsonProof[]>(Prisma.sql`
            SELECT COALESCE(
                "providerResponse" ->> 'id' = "providerCheckoutId"
                AND "providerResponse" ->> 'externalId' = ${input.orderUuid}
                AND "providerResponse" ->> 'amount' = ${String(input.expectedAmountInCents)}
                AND "providerResponse" ->> 'devMode' = 'false',
                false
            ) AS matches
            FROM "OrderPayment"
            WHERE id = ${order.payment.id}
        `);
        paymentProviderProofMatches = proof[0]?.matches === true;
    }

    let webhookPayloadProofMatches = false;
    if (webhook && order?.payment?.providerCheckoutId) {
        const proof = await transaction.$queryRaw<JsonProof[]>(Prisma.sql`
            SELECT COALESCE(
                payload ->> 'devMode' = 'false'
                AND payload #>> '{data,checkout,id}' = ${order.payment.providerCheckoutId}
                AND payload #>> '{data,checkout,externalId}' = ${input.orderUuid}
                AND payload #>> '{data,checkout,amount}' = ${String(input.expectedAmountInCents)}
                AND payload #>> '{data,checkout,paidAmount}' = ${String(input.expectedAmountInCents)},
                false
            ) AS matches
            FROM "PaymentWebhookEvent"
            WHERE id = ${webhook.id}
        `);
        webhookPayloadProofMatches = proof[0]?.matches === true;
    }

    const orderId = order?.id ?? -1;
    const [fulfillmentCount, shipmentCount, emailJobs, otherOrders, otherLinks] = await Promise.all(
        [
            transaction.fulfillmentJob.count({ where: { orderId } }),
            transaction.orderShipment.count({ where: { orderId } }),
            transaction.emailJob.findMany({
                where: { deduplicationKey: `payment-paid:${input.orderUuid}` },
                select: {
                    status: true,
                    type: true,
                    providerMessageId: true,
                    sentAt: true,
                    deliveryLogs: { select: { status: true, providerMessageId: true } }
                }
            }),
            transaction.orderPayment.count({
                where: {
                    orderId: { not: orderId },
                    status: "PENDING",
                    providerCheckoutId: { not: null },
                    checkoutUrl: { not: null }
                }
            }),
            transaction.paymentLink.count({
                where: {
                    status: "PENDING",
                    providerCheckoutId: { not: null },
                    checkoutUrl: { not: null }
                }
            })
        ]
    );
    const email = emailJobs[0];

    return {
        environment: {
            nodeEnvironment: process.env.NODE_ENV,
            checkoutEnabled: process.env.CHECKOUT_ENABLED,
            rolloutMode: process.env.CHECKOUT_ROLLOUT_MODE,
            allowedUserCount: 1
        },
        order: {
            found: Boolean(order),
            ownerUuid: order?.user.uuid ?? null,
            ownerActive: order?.user.isActive ?? false,
            status: order?.status ?? null,
            totalInCents: order?.totalInCents ?? null,
            checkoutProvider: order?.checkoutProvider ?? null,
            checkoutReference: order?.checkoutReference ?? null,
            createdAt: order?.createdAt ?? null
        },
        payment: {
            found: Boolean(order?.payment),
            provider: order?.payment?.provider ?? null,
            status: order?.payment?.status ?? null,
            providerMethod: order?.payment?.providerMethod ?? null,
            providerCheckoutId: order?.payment?.providerCheckoutId ?? null,
            expectedAmountInCents: order?.payment?.expectedAmountInCents ?? null,
            paidAmountInCents: order?.payment?.paidAmountInCents ?? null,
            paidAt: order?.payment?.paidAt ?? null,
            providerProofMatches: paymentProviderProofMatches
        },
        webhook: {
            found: Boolean(webhook),
            provider: webhook?.provider ?? null,
            eventType: webhook?.eventType ?? null,
            processedAt: webhook?.processedAt ?? null,
            error: webhook?.error ?? null,
            createdAt: webhook?.createdAt ?? null,
            payloadProofMatches: webhookPayloadProofMatches
        },
        fulfillment: {
            count: fulfillmentCount,
            status: order?.fulfillmentJob?.status ?? null,
            createdAt: order?.fulfillmentJob?.createdAt ?? null,
            completedAt: order?.fulfillmentJob?.completedAt ?? null
        },
        shipment: {
            count: shipmentCount,
            status: order?.shipment?.status ?? null,
            providerOrderIdPresent: Boolean(order?.shipment?.superfreteOrderId),
            purchasedAt: order?.shipment?.purchasedAt ?? null
        },
        email: {
            count: emailJobs.length,
            type: email?.type ?? null,
            status: email?.status ?? null,
            providerMessageIdPresent: Boolean(email?.providerMessageId),
            providerRecordMatches: Boolean(
                email?.providerMessageId &&
                email.deliveryLogs.some(
                    (item) =>
                        item.status === "ACCEPTED" &&
                        item.providerMessageId === email.providerMessageId
                )
            ),
            sentAt: email?.sentAt ?? null,
            acceptedDeliveryCount:
                email?.deliveryLogs.filter((item) => item.status === "ACCEPTED").length ?? 0
        },
        inventory: {
            otherPayableOrderCheckouts: otherOrders,
            otherPayablePaymentLinks: otherLinks
        }
    };
}

async function main() {
    const startedAt = performance.now();
    const input = readProductionSmokeInputs(process.env);
    const connectionString = productionSmokeDatabaseUrl(process.env);
    const prisma = new PrismaClient({ adapter: new PrismaPg({ connectionString }) });
    try {
        const snapshot = await prisma.$transaction(
            async (transaction) => {
                await transaction.$executeRaw`SET TRANSACTION ISOLATION LEVEL REPEATABLE READ, READ ONLY`;
                const database = await transaction.$queryRaw<Array<{ name: string }>>`
                    SELECT current_database() AS name
                `;
                if (database.length !== 1 || database[0].name !== input.expectedDatabaseName) {
                    throw new Error("unexpected connected database");
                }
                return readSnapshot(transaction, input);
            },
            { timeout: 30_000 }
        );
        const report = evaluateProductionSmoke(input, snapshot);
        process.stdout.write(
            `${JSON.stringify({ ...report, durationMs: Math.round(performance.now() - startedAt) }, null, 2)}\n`
        );
        if (report.overallStatus !== "MANUAL_REQUIRED") process.exitCode = 1;
    } finally {
        await prisma.$disconnect().catch(() => undefined);
    }
}

void main().catch(() => {
    process.stdout.write(
        `${JSON.stringify({ overallStatus: "AUTO_FAIL", automaticChecks: [{ id: "production_smoke_probe", status: "AUTO_FAIL" }], manualChecks: manualProductionSmokeChecks() }, null, 2)}\n`
    );
    process.exitCode = 1;
});
