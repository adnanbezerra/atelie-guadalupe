import { createHash } from "node:crypto";
import { Prisma, PrismaClient } from "../../generated/prisma/client";
import {
    EmailJobStatus,
    FulfillmentJobStatus,
    OrderStatus,
    PaymentLinkStatus,
    PaymentStatus,
    ShippingStatus
} from "../../generated/prisma/enums";
import { CheckoutTelemetry, checkoutTelemetry } from "./checkout-telemetry";

const FIVE_MINUTES_MS = 5 * 60_000;
const TWO_MINUTES_MS = 2 * 60_000;
const WEBHOOK_PROCESSING_MARKER = "__PROCESSING__";

export const checkoutAlertDefinitions = {
    checkout_http_errors: {
        threshold: "3 respostas 5xx",
        window: "5 min",
        action: "desativar novos checkouts e verificar erro dominante"
    },
    provider_errors: {
        threshold: "3 erros por provedor",
        window: "5 min",
        action: "desativar checkout se cobranca estiver incerta e consultar provedor"
    },
    provider_latency: {
        threshold: "p95 >2s AbacatePay ou >3s Superfrete (min. 3)",
        window: "5 min",
        action: "verificar degradacao do provedor antes de timeout"
    },
    payment_creating_stale: {
        threshold: ">=1 CREATING >2 min",
        window: "estado atual",
        action: "reconciliar pelo externalId sem criar nova cobranca"
    },
    payment_pending_stale: {
        threshold: ">=1 PENDING acima do prazo",
        window: "estado atual",
        action: "consultar checkout no provedor e confirmar prazo de pagamento"
    },
    webhook_processing_stale: {
        threshold: ">=1 com erro ou nao processado >2 min",
        window: "estado atual",
        action: "preservar evento, corrigir causa e reprocessar com seguranca"
    },
    paid_payment_invalid_order: {
        threshold: ">=1",
        window: "estado atual",
        action: "interromper expansao e reconciliar estado financeiro do pedido"
    },
    paid_order_without_fulfillment: {
        threshold: ">=1 PAID >2 min",
        window: "estado atual",
        action: "verificar worker e enfileirar fulfillment idempotente"
    },
    fulfillment_retry_stale: {
        threshold: ">=1 retry com >=2 tentativas ou >5 min",
        window: "estado atual",
        action: "consultar tentativa e estado da etiqueta antes de retry"
    },
    payment_amount_mismatch: {
        threshold: ">=1",
        window: "estado atual",
        action: "desativar checkout e iniciar reconciliacao financeira"
    },
    cancelled_order_paid: {
        threshold: ">=1",
        window: "estado atual",
        action: "executar procedimento de reembolso de pagamento tardio"
    },
    email_failed: {
        threshold: ">=1 FAILED",
        window: "estado atual",
        action: "verificar Resend e reenfileirar somente com chave idempotente"
    },
    shipping_label_missing: {
        threshold: ">=1 PAID/PROCESSING >5 min sem etiqueta",
        window: "estado atual",
        action: "consultar Superfrete antes de reexecutar fulfillment"
    }
} as const;

export type CheckoutAlertType = keyof typeof checkoutAlertDefinitions;

export type CheckoutAlert = {
    alertType: CheckoutAlertType;
    count: number;
    sampleIds: string[];
    sampleDetails?: Array<Record<string, string | number>>;
};

type ObservabilityLogger = {
    info(fields: Record<string, unknown>, message: string): void;
    error(fields: Record<string, unknown>, message: string): void;
};

export class CheckoutObservabilityService {
    public constructor(
        private readonly prisma: PrismaClient,
        private readonly logger: ObservabilityLogger,
        private readonly telemetry: CheckoutTelemetry = checkoutTelemetry
    ) {}

    public async inspect(now = new Date()) {
        const telemetry = this.telemetry.snapshot(FIVE_MINUTES_MS, now.getTime());
        this.logger.info(
            { metricType: "checkout_health", ...telemetry },
            "Metricas operacionais do checkout"
        );

        const alerts = [...this.telemetryAlerts(telemetry), ...(await this.databaseAlerts(now))];
        const common = {
            alertChannel: process.env.CHECKOUT_ALERT_CHANNEL ?? "unconfigured",
            alertOwner: process.env.CHECKOUT_ALERT_OWNER ?? "unconfigured",
            logQueryUrl: process.env.CHECKOUT_LOG_QUERY_URL ?? "unconfigured",
            runbookUrl: process.env.CHECKOUT_RUNBOOK_URL ?? "docs/CHECKOUT_RUNBOOK.md"
        };
        for (const alert of alerts) {
            this.logger.error(
                {
                    metricType: "checkout_alert",
                    ...common,
                    ...checkoutAlertDefinitions[alert.alertType],
                    ...alert
                },
                "Alerta operacional do checkout"
            );
        }
        return { telemetry, alerts };
    }

    private telemetryAlerts(snapshot: ReturnType<CheckoutTelemetry["snapshot"]>) {
        const alerts: CheckoutAlert[] = [];
        const serverErrors = snapshot.checkoutHttpAttempts
            .filter((item) => item.statusCode >= 500)
            .reduce((total, item) => total + item.count, 0);
        if (serverErrors >= 3) {
            alerts.push({ alertType: "checkout_http_errors", count: serverErrors, sampleIds: [] });
        }
        for (const provider of ["ABACATEPAY", "SUPERFRETE"] as const) {
            const metrics = snapshot.providers.find((item) => item.provider === provider);
            if (metrics && metrics.errorCount >= 3) {
                alerts.push({
                    alertType: "provider_errors",
                    count: metrics.errorCount,
                    sampleIds: [provider]
                });
            }
            const limit = provider === "ABACATEPAY" ? 2000 : 3000;
            if (metrics && metrics.totalCount >= 3 && metrics.p95DurationMs > limit) {
                alerts.push({
                    alertType: "provider_latency",
                    count: metrics.totalCount,
                    sampleIds: [provider]
                });
            }
        }
        return alerts;
    }

    private async databaseAlerts(now: Date): Promise<CheckoutAlert[]> {
        const twoMinutesAgo = new Date(now.getTime() - TWO_MINUTES_MS);
        const fiveMinutesAgo = new Date(now.getTime() - FIVE_MINUTES_MS);
        const pendingMinutes = positiveNumber(process.env.PAYMENT_PENDING_ALERT_MINUTES, 30);
        const pendingBefore = new Date(now.getTime() - pendingMinutes * 60_000);

        const [
            creating,
            pending,
            creatingLinks,
            pendingLinks,
            webhooks,
            invalidPaid,
            paidWithoutFulfillment,
            retries,
            mismatches,
            cancelledPaid,
            failedEmails,
            missingLabels
        ] = await Promise.all([
            this.prisma.orderPayment.findMany({
                where: { status: PaymentStatus.CREATING, updatedAt: { lt: twoMinutesAgo } },
                select: { uuid: true },
                take: 20
            }),
            this.prisma.orderPayment.findMany({
                where: { status: PaymentStatus.PENDING, updatedAt: { lt: pendingBefore } },
                select: { uuid: true },
                take: 20
            }),
            this.prisma.paymentLink.findMany({
                where: { status: PaymentLinkStatus.CREATING, updatedAt: { lt: twoMinutesAgo } },
                select: { uuid: true },
                take: 20
            }),
            this.prisma.paymentLink.findMany({
                where: { status: PaymentLinkStatus.PENDING, updatedAt: { lt: pendingBefore } },
                select: { uuid: true },
                take: 20
            }),
            this.prisma.paymentWebhookEvent.findMany({
                where: {
                    OR: [
                        {
                            AND: [
                                { error: { not: null } },
                                { NOT: { error: WEBHOOK_PROCESSING_MARKER } }
                            ]
                        },
                        { processedAt: null, createdAt: { lt: twoMinutesAgo } }
                    ]
                },
                select: { eventId: true },
                take: 20
            }),
            this.prisma.orderPayment.findMany({
                where: {
                    status: PaymentStatus.PAID,
                    order: {
                        status: {
                            notIn: [
                                OrderStatus.PAID,
                                OrderStatus.PROCESSING,
                                OrderStatus.SHIPPED,
                                OrderStatus.DELIVERED
                            ]
                        }
                    }
                },
                select: { uuid: true },
                take: 20
            }),
            this.prisma.order.findMany({
                where: {
                    status: OrderStatus.PAID,
                    updatedAt: { lt: twoMinutesAgo },
                    fulfillmentJob: null
                },
                select: { uuid: true },
                take: 20
            }),
            this.prisma.fulfillmentJob.findMany({
                where: {
                    status: FulfillmentJobStatus.RETRY_SCHEDULED,
                    OR: [{ attempts: { gte: 2 } }, { updatedAt: { lt: fiveMinutesAgo } }]
                },
                select: { uuid: true, attempts: true, createdAt: true },
                take: 20
            }),
            this.prisma.$queryRaw<Array<{ uuid: string }>>(Prisma.sql`
                SELECT "uuid"::text AS "uuid"
                FROM "OrderPayment"
                WHERE "paidAmountInCents" IS NOT NULL
                  AND "paidAmountInCents" <> "expectedAmountInCents"
                LIMIT 20
            `),
            this.prisma.order.findMany({
                where: {
                    status: OrderStatus.CANCELLED,
                    payment: {
                        is: { status: { in: [PaymentStatus.PAID, PaymentStatus.REFUND_PENDING] } }
                    }
                },
                select: { uuid: true },
                take: 20
            }),
            this.prisma.emailJob.findMany({
                where: { status: EmailJobStatus.FAILED },
                select: { uuid: true },
                take: 20
            }),
            this.prisma.order.findMany({
                where: {
                    status: { in: [OrderStatus.PAID, OrderStatus.PROCESSING] },
                    updatedAt: { lt: fiveMinutesAgo },
                    OR: [
                        { shipment: null },
                        { shipment: { is: { status: { not: ShippingStatus.LABEL_PURCHASED } } } }
                    ]
                },
                select: { uuid: true },
                take: 20
            })
        ]);

        return [
            alert(
                "payment_creating_stale",
                [...creating, ...creatingLinks].map((item) => item.uuid)
            ),
            alert(
                "payment_pending_stale",
                [...pending, ...pendingLinks].map((item) => item.uuid)
            ),
            alert(
                "webhook_processing_stale",
                webhooks.map((item) => safeWebhookEventId(item.eventId))
            ),
            alert(
                "paid_payment_invalid_order",
                invalidPaid.map((item) => item.uuid)
            ),
            alert(
                "paid_order_without_fulfillment",
                paidWithoutFulfillment.map((item) => item.uuid)
            ),
            fulfillmentRetryAlert(retries, now),
            alert(
                "payment_amount_mismatch",
                mismatches.map((item) => item.uuid)
            ),
            alert(
                "cancelled_order_paid",
                cancelledPaid.map((item) => item.uuid)
            ),
            alert(
                "email_failed",
                failedEmails.map((item) => item.uuid)
            ),
            alert(
                "shipping_label_missing",
                missingLabels.map((item) => item.uuid)
            )
        ].filter((item): item is CheckoutAlert => item !== null);
    }
}

function alert(alertType: CheckoutAlertType, sampleIds: string[]): CheckoutAlert | null {
    return sampleIds.length === 0 ? null : { alertType, count: sampleIds.length, sampleIds };
}

function fulfillmentRetryAlert(
    retries: Array<{ uuid: string; attempts: number; createdAt: Date }>,
    now: Date
): CheckoutAlert | null {
    if (retries.length === 0) return null;
    return {
        alertType: "fulfillment_retry_stale",
        count: retries.length,
        sampleIds: retries.map((item) => item.uuid),
        sampleDetails: retries.map((item) => ({
            uuid: item.uuid,
            attempts: item.attempts,
            ageSeconds: Math.max(0, Math.floor((now.getTime() - item.createdAt.getTime()) / 1000))
        }))
    };
}

function safeWebhookEventId(eventId: string) {
    return `sha256:${createHash("sha256").update(eventId).digest("hex").slice(0, 16)}`;
}

function positiveNumber(value: string | undefined, fallback: number) {
    const parsed = Number(value ?? fallback);
    return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback;
}
