import * as assert from "node:assert";
import { test } from "node:test";
import { CheckoutObservabilityService } from "../../../src/modules/observability/checkout-observability-service";
import { CheckoutTelemetry } from "../../../src/modules/observability/checkout-telemetry";

test("controlled checkout anomaly reaches actionable alert sink without sensitive data", async () => {
    let paymentQuery = 0;
    let orderQuery = 0;
    let webhookWhere: unknown;
    const prisma = {
        orderPayment: {
            findMany: async () => {
                paymentQuery += 1;
                if (paymentQuery === 1) return [{ uuid: "payment-creating" }];
                if (paymentQuery === 2) return [{ uuid: "payment-pending" }];
                if (paymentQuery === 3) return [{ uuid: "payment-invalid-order" }];
                return [];
            }
        },
        paymentWebhookEvent: {
            findMany: async ({ where }: { where: unknown }) => {
                webhookWhere = where;
                return [{ eventId: "customer@example.com" }];
            }
        },
        paymentLink: { findMany: async () => [] },
        fulfillmentJob: {
            findMany: async () => [
                {
                    uuid: "fulfillment-retry",
                    attempts: 3,
                    createdAt: new Date(10_000 - 600_000)
                }
            ]
        },
        emailJob: { findMany: async () => [{ uuid: "email-failed" }] },
        $queryRaw: async () => [{ uuid: "payment-mismatch" }],
        order: {
            findMany: async () => {
                orderQuery += 1;
                if (orderQuery === 1) return [{ uuid: "order-no-fulfillment" }];
                if (orderQuery === 2) return [{ uuid: "order-cancelled-paid" }];
                return [{ uuid: "order-no-label" }];
            }
        }
    };
    const telemetry = new CheckoutTelemetry();
    for (let index = 0; index < 3; index += 1) {
        telemetry.recordCheckoutHttp(
            { route: "/orders/:orderUuid/payment", statusCode: 503, durationMs: 50 },
            1_000 + index
        );
        telemetry.recordProvider(
            {
                provider: "ABACATEPAY",
                operation: "POST /checkouts/create",
                result: "error",
                durationMs: 2500
            },
            1_000 + index
        );
    }
    const infoLogs: Record<string, unknown>[] = [];
    const alertLogs: Record<string, unknown>[] = [];
    const logger = {
        info: (fields: Record<string, unknown>) => infoLogs.push(fields),
        error: (fields: Record<string, unknown>) => alertLogs.push(fields)
    };
    const previous = {
        channel: process.env.CHECKOUT_ALERT_CHANNEL,
        owner: process.env.CHECKOUT_ALERT_OWNER,
        logs: process.env.CHECKOUT_LOG_QUERY_URL,
        runbook: process.env.CHECKOUT_RUNBOOK_URL
    };
    process.env.CHECKOUT_ALERT_CHANNEL = "operations-checkout";
    process.env.CHECKOUT_ALERT_OWNER = "tech-on-call";
    process.env.CHECKOUT_LOG_QUERY_URL = "https://logs.example.com/checkout";
    process.env.CHECKOUT_RUNBOOK_URL = "https://docs.example.com/checkout-runbook";

    try {
        const result = await new CheckoutObservabilityService(
            prisma as never,
            logger,
            telemetry
        ).inspect(new Date(10_000));

        assert.equal(infoLogs[0].metricType, "checkout_health");
        assert.deepEqual(webhookWhere, {
            OR: [
                {
                    AND: [{ error: { not: null } }, { NOT: { error: "__PROCESSING__" } }]
                },
                { processedAt: null, createdAt: { lt: new Date(10_000 - 2 * 60_000) } }
            ]
        });
        assert.equal(result.alerts.length, 13);
        assert.equal(alertLogs.length, 13);
        const creating = alertLogs.find((item) => item.alertType === "payment_creating_stale");
        assert.deepEqual(creating, {
            metricType: "checkout_alert",
            alertChannel: "operations-checkout",
            alertOwner: "tech-on-call",
            logQueryUrl: "https://logs.example.com/checkout",
            runbookUrl: "https://docs.example.com/checkout-runbook",
            threshold: ">=1 CREATING >2 min",
            window: "estado atual",
            action: "reconciliar pelo externalId sem criar nova cobranca",
            alertType: "payment_creating_stale",
            count: 1,
            sampleIds: ["payment-creating"]
        });
        const webhook = alertLogs.find((item) => item.alertType === "webhook_processing_stale");
        assert.match((webhook?.sampleIds as string[])[0], /^sha256:[a-f0-9]{16}$/);
        const fulfillment = alertLogs.find((item) => item.alertType === "fulfillment_retry_stale");
        assert.deepEqual(fulfillment?.sampleDetails, [
            { uuid: "fulfillment-retry", attempts: 3, ageSeconds: 600 }
        ]);
        assert.equal(JSON.stringify(alertLogs).includes("customer@example.com"), false);
        assert.equal(JSON.stringify(alertLogs).includes("recipient"), false);
    } finally {
        restore("CHECKOUT_ALERT_CHANNEL", previous.channel);
        restore("CHECKOUT_ALERT_OWNER", previous.owner);
        restore("CHECKOUT_LOG_QUERY_URL", previous.logs);
        restore("CHECKOUT_RUNBOOK_URL", previous.runbook);
    }
});

function restore(name: string, value: string | undefined) {
    if (value === undefined) delete process.env[name];
    else process.env[name] = value;
}
