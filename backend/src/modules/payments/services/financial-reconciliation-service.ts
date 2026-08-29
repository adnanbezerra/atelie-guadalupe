import { createHash } from "node:crypto";
import { PrismaClient } from "../../../generated/prisma/client";
import { OrderStatus, PaymentStatus } from "../../../generated/prisma/enums";
import { AbacateCheckout } from "./abacatepay-client";

const FINANCIAL_LOCAL_STATUSES = new Set<string>([
    PaymentStatus.PAID,
    PaymentStatus.REFUND_PENDING,
    PaymentStatus.REFUNDED,
    PaymentStatus.DISPUTED,
    PaymentStatus.LOST
]);
const FINANCIAL_LOCAL_STATUS_VALUES = [...FINANCIAL_LOCAL_STATUSES] as PaymentStatus[];
const FINANCIAL_ORDER_STATUSES = [
    OrderStatus.PAID,
    OrderStatus.PROCESSING,
    OrderStatus.SHIPPED,
    OrderStatus.DELIVERED
];
const FINANCIAL_PROVIDER_STATUSES = new Set(["PAID", "REFUNDED"]);
const RESOLUTION_CODES = new Set([
    "WEBHOOK_REPROCESSED",
    "PROVIDER_RECORD_CORRECTED",
    "LOCAL_RECORD_REPAIRED",
    "REFUND_CONFIRMED",
    "FALSE_POSITIVE",
    "OTHER_CONTROLLED_PROCEDURE"
]);

export type LocalReconciliationPayment = {
    orderUuid: string;
    orderStatus: string;
    providerCheckoutId: string | null;
    status: string;
    expectedAmountInCents: number;
    paidAmountInCents: number | null;
    paidAt: Date | null;
    refundedAt: Date | null;
    updatedAt: Date;
};

export type LocalPaidOrder = {
    orderUuid: string;
    payment: LocalReconciliationPayment | null;
};

export interface FinancialReconciliationLocalSource {
    listPayments(): Promise<LocalReconciliationPayment[]>;
    listPaidOrders(): Promise<LocalPaidOrder[]>;
}

export interface FinancialReconciliationProviderSource {
    listCheckouts(): Promise<AbacateCheckout[]>;
}

export type ResolutionEvent = {
    at: string;
    owner: string;
    status: "OPEN" | "INVESTIGATING" | "RESOLVED";
    resolutionCode?:
        | "WEBHOOK_REPROCESSED"
        | "PROVIDER_RECORD_CORRECTED"
        | "LOCAL_RECORD_REPAIRED"
        | "REFUND_CONFIRMED"
        | "FALSE_POSITIVE"
        | "OTHER_CONTROLLED_PROCEDURE";
    auditReference?: string;
};

export type ResolutionRegistry = Record<string, ResolutionEvent[]>;

export type FinancialDivergenceType =
    | "PROVIDER_PAYMENT_WITHOUT_ORDER"
    | "PAID_ORDER_WITHOUT_PAYMENT"
    | "LOCAL_PAYMENT_WITHOUT_PROVIDER"
    | "PROVIDER_ID_MISMATCH"
    | "DUPLICATE_PROVIDER_EXTERNAL_ID"
    | "ORDER_PAYMENT_STATUS_MISMATCH"
    | "AMOUNT_MISMATCH"
    | "EXTERNAL_ID_MISMATCH"
    | "STATUS_MISMATCH"
    | "TIME_MISMATCH";

export type FinancialDivergence = {
    fingerprint: string;
    type: FinancialDivergenceType;
    orderUuid: string | null;
    providerCheckoutId: string | null;
    local: {
        orderStatus: string;
        paymentStatus: string;
        expectedAmountInCents: number;
        paidAmountInCents: number | null;
        paidAt: string | null;
        refundedAt: string | null;
        updatedAt: string;
    } | null;
    provider: {
        externalId: string | null;
        status: string;
        amountInCents: number;
        paidAmountInCents: number | null;
        updatedAt: string | null;
    } | null;
    owner: string;
    resolutionStatus: ResolutionEvent["status"];
    resolutionCode: ResolutionEvent["resolutionCode"] | null;
    auditReference: string | null;
    resolutionUpdatedAt: string | null;
};

export type FinancialReconciliationReport = {
    schemaVersion: 1;
    audit: {
        generatedAt: string;
        periodFrom: string;
        periodTo: string;
        source: "ABACATEPAY_AND_LOCAL_DATABASE";
        readOnly: true;
        containsPii: false;
        providerActivityWindow: "updatedAt >= periodFrom AND updatedAt < periodTo";
        persistentInvariantSweep: "ALL_CURRENT_PROVIDER_AND_LOCAL_FINANCIAL_RECORDS";
    };
    summary: {
        providerCheckoutsRead: number;
        providerCheckoutsInActivityWindow: number;
        providerCheckoutsCompared: number;
        localPaymentsRead: number;
        localPaidOrdersRead: number;
        divergences: number;
        byType: Partial<Record<FinancialDivergenceType, number>>;
    };
    divergences: FinancialDivergence[];
};

export class PrismaFinancialReconciliationSource implements FinancialReconciliationLocalSource {
    private readonly pageSize: number;
    private readonly maxRecords: number;
    private readonly maxPages: number;

    public constructor(
        private readonly prisma: PrismaClient,
        limits: { pageSize?: number; maxRecords?: number; maxPages?: number } = {}
    ) {
        this.pageSize = limits.pageSize ?? 1000;
        this.maxRecords =
            limits.maxRecords ??
            Number(process.env.FINANCIAL_RECONCILIATION_MAX_LOCAL_RECORDS ?? 100000);
        this.maxPages =
            limits.maxPages ?? Number(process.env.FINANCIAL_RECONCILIATION_MAX_LOCAL_PAGES ?? 2000);
        if (
            !Number.isInteger(this.pageSize) ||
            this.pageSize <= 0 ||
            this.pageSize > 5000 ||
            !Number.isInteger(this.maxRecords) ||
            this.maxRecords <= 0 ||
            !Number.isInteger(this.maxPages) ||
            this.maxPages <= 0
        ) {
            throw new Error("Limites locais da reconciliacao financeira invalidos");
        }
    }

    public async listPayments(): Promise<LocalReconciliationPayment[]> {
        const select = {
            id: true,
            providerCheckoutId: true,
            status: true,
            expectedAmountInCents: true,
            paidAmountInCents: true,
            paidAt: true,
            refundedAt: true,
            updatedAt: true,
            order: { select: { uuid: true, status: true } }
        } as const;
        const payments = await this.readAllPages(
            "pagamentos financeiros",
            (cursor) =>
                this.prisma.orderPayment.findMany({
                    where: { status: { in: FINANCIAL_LOCAL_STATUS_VALUES } },
                    select,
                    orderBy: { id: "asc" },
                    take: this.pageSize,
                    ...(cursor === null ? {} : { cursor: { id: cursor }, skip: 1 })
                }),
            (payment) => payment.id
        );
        return payments.map((payment) => ({
            orderUuid: payment.order.uuid,
            orderStatus: payment.order.status,
            providerCheckoutId: payment.providerCheckoutId,
            status: payment.status,
            expectedAmountInCents: payment.expectedAmountInCents,
            paidAmountInCents: payment.paidAmountInCents,
            paidAt: payment.paidAt,
            refundedAt: payment.refundedAt,
            updatedAt: payment.updatedAt
        }));
    }

    public async listPaidOrders(): Promise<LocalPaidOrder[]> {
        const select = {
            id: true,
            uuid: true,
            status: true,
            payment: {
                select: {
                    providerCheckoutId: true,
                    status: true,
                    expectedAmountInCents: true,
                    paidAmountInCents: true,
                    paidAt: true,
                    refundedAt: true,
                    updatedAt: true
                }
            }
        } as const;
        const orders = await this.readAllPages(
            "pedidos financeiros",
            (cursor) =>
                this.prisma.order.findMany({
                    where: { status: { in: FINANCIAL_ORDER_STATUSES } },
                    select,
                    orderBy: { id: "asc" },
                    take: this.pageSize,
                    ...(cursor === null ? {} : { cursor: { id: cursor }, skip: 1 })
                }),
            (order) => order.id
        );
        return orders.map((order) => ({
            orderUuid: order.uuid,
            payment: order.payment
                ? {
                      orderUuid: order.uuid,
                      orderStatus: order.status,
                      ...order.payment
                  }
                : null
        }));
    }

    private async readAllPages<T>(
        label: string,
        read: (cursor: number | null) => Promise<T[]>,
        id: (item: T) => number
    ) {
        const records: T[] = [];
        const seen = new Set<number>();
        let cursor: number | null = null;
        for (let page = 1; page <= this.maxPages; page += 1) {
            const batch = await read(cursor);
            if (batch.length > this.pageSize) {
                throw new Error(`Banco excedeu tamanho de pagina para ${label}`);
            }
            for (const item of batch) {
                const itemId = id(item);
                if (!Number.isInteger(itemId) || seen.has(itemId)) {
                    throw new Error(`Banco repetiu cursor durante leitura de ${label}`);
                }
                seen.add(itemId);
                records.push(item);
                if (records.length > this.maxRecords) {
                    throw new Error(`Reconciliacao excedeu limite local de ${label}`);
                }
            }
            if (batch.length < this.pageSize) return records;
            const nextCursor = id(batch.at(-1)!);
            if (nextCursor === cursor) {
                throw new Error(`Banco repetiu cursor durante leitura de ${label}`);
            }
            cursor = nextCursor;
        }
        throw new Error(`Reconciliacao excedeu limite local de paginas para ${label}`);
    }
}

export class FinancialReconciliationService {
    public constructor(
        private readonly local: FinancialReconciliationLocalSource,
        private readonly provider: FinancialReconciliationProviderSource,
        private readonly options: {
            owner: string;
            periodFrom: Date;
            periodTo: Date;
            generatedAt?: Date;
            timestampToleranceMs?: number;
            resolutions?: ResolutionRegistry;
        }
    ) {
        if (!/^[A-Za-z0-9_.:/-]{2,80}$/.test(options.owner)) {
            throw new Error(
                "Responsavel deve ser identificador operacional sem nome ou e-mail pessoal"
            );
        }
        if (
            !Number.isFinite(options.periodFrom.getTime()) ||
            !Number.isFinite(options.periodTo.getTime()) ||
            options.periodFrom >= options.periodTo
        ) {
            throw new Error("Periodo de reconciliacao invalido");
        }
        this.validateResolutions(options.resolutions ?? {});
    }

    public async run(): Promise<FinancialReconciliationReport> {
        const allProviderCheckouts = await this.provider.listCheckouts();
        const providerCheckoutsInWindow = allProviderCheckouts.filter((checkout) =>
            this.providerCheckoutInWindow(checkout)
        );
        const [localPayments, paidOrders] = await Promise.all([
            this.local.listPayments(),
            this.local.listPaidOrders()
        ]);
        const localProviderIds = new Set(
            localPayments.map((payment) => payment.providerCheckoutId).filter(Boolean)
        );
        const localOrderUuids = new Set(localPayments.map((payment) => payment.orderUuid));
        const providerExternalIdsInWindow = new Set(
            providerCheckoutsInWindow.map((checkout) => checkout.externalId)
        );
        const providerCheckouts = allProviderCheckouts.filter(
            (checkout) =>
                FINANCIAL_PROVIDER_STATUSES.has(checkout.status) ||
                this.providerCheckoutInWindow(checkout) ||
                localProviderIds.has(checkout.id) ||
                localOrderUuids.has(checkout.externalId) ||
                providerExternalIdsInWindow.has(checkout.externalId)
        );
        const findings: Array<{
            type: FinancialDivergenceType;
            local: LocalReconciliationPayment | null;
            provider: AbacateCheckout | null;
            orderUuid: string | null;
            providerCheckoutId: string | null;
        }> = [];
        const localByProviderId = new Map(
            localPayments
                .filter((payment) => payment.providerCheckoutId)
                .map((payment) => [payment.providerCheckoutId!, payment])
        );
        const localByOrderUuid = new Map(
            localPayments.map((payment) => [payment.orderUuid, payment])
        );
        const providerById = new Map(providerCheckouts.map((checkout) => [checkout.id, checkout]));

        const providerByExternalId = new Map<string, AbacateCheckout>();
        for (const checkout of providerCheckouts) {
            if (checkout.externalId.startsWith("payment-link:")) continue;
            const previous = providerByExternalId.get(checkout.externalId);
            if (previous) {
                findings.push({
                    type: "DUPLICATE_PROVIDER_EXTERNAL_ID",
                    local:
                        localByProviderId.get(checkout.id) ??
                        localByProviderId.get(previous.id) ??
                        localByOrderUuid.get(checkout.externalId) ??
                        null,
                    provider: checkout,
                    orderUuid:
                        localByProviderId.get(checkout.id)?.orderUuid ??
                        localByProviderId.get(previous.id)?.orderUuid ??
                        null,
                    providerCheckoutId: checkout.id
                });
            } else {
                providerByExternalId.set(checkout.externalId, checkout);
            }
        }

        for (const checkout of providerCheckouts) {
            if (checkout.externalId.startsWith("payment-link:")) continue;
            const local =
                localByProviderId.get(checkout.id) ??
                localByOrderUuid.get(checkout.externalId) ??
                null;
            const financiallyRelevant =
                FINANCIAL_PROVIDER_STATUSES.has(checkout.status) ||
                (local !== null && FINANCIAL_LOCAL_STATUSES.has(local.status));
            if (!financiallyRelevant) continue;
            if (!local) {
                findings.push({
                    type: "PROVIDER_PAYMENT_WITHOUT_ORDER",
                    local: null,
                    provider: checkout,
                    orderUuid: null,
                    providerCheckoutId: checkout.id
                });
                continue;
            }
            this.comparePair(findings, local, checkout);
        }

        for (const payment of localPayments) {
            if (!FINANCIAL_LOCAL_STATUSES.has(payment.status)) continue;
            if (!this.orderAndPaymentStatusesAgree(payment.orderStatus, payment.status)) {
                findings.push({
                    type: "ORDER_PAYMENT_STATUS_MISMATCH",
                    local: payment,
                    provider: payment.providerCheckoutId
                        ? (providerById.get(payment.providerCheckoutId) ?? null)
                        : null,
                    orderUuid: payment.orderUuid,
                    providerCheckoutId: payment.providerCheckoutId
                });
            }
            if (!payment.providerCheckoutId || !providerById.has(payment.providerCheckoutId)) {
                findings.push({
                    type: "LOCAL_PAYMENT_WITHOUT_PROVIDER",
                    local: payment,
                    provider: null,
                    orderUuid: payment.orderUuid,
                    providerCheckoutId: payment.providerCheckoutId
                });
            }
        }

        for (const order of paidOrders) {
            if (!order.payment || !FINANCIAL_LOCAL_STATUSES.has(order.payment.status)) {
                findings.push({
                    type: "PAID_ORDER_WITHOUT_PAYMENT",
                    local: order.payment,
                    provider: null,
                    orderUuid: order.orderUuid,
                    providerCheckoutId: order.payment?.providerCheckoutId ?? null
                });
            }
        }

        const divergences = findings
            .map((finding) => this.present(finding))
            .sort((left, right) => left.fingerprint.localeCompare(right.fingerprint));
        const byType: Partial<Record<FinancialDivergenceType, number>> = {};
        for (const divergence of divergences) {
            byType[divergence.type] = (byType[divergence.type] ?? 0) + 1;
        }

        return {
            schemaVersion: 1,
            audit: {
                generatedAt: (this.options.generatedAt ?? new Date()).toISOString(),
                periodFrom: this.options.periodFrom.toISOString(),
                periodTo: this.options.periodTo.toISOString(),
                source: "ABACATEPAY_AND_LOCAL_DATABASE",
                readOnly: true,
                containsPii: false,
                providerActivityWindow: "updatedAt >= periodFrom AND updatedAt < periodTo",
                persistentInvariantSweep: "ALL_CURRENT_PROVIDER_AND_LOCAL_FINANCIAL_RECORDS"
            },
            summary: {
                providerCheckoutsRead: allProviderCheckouts.length,
                providerCheckoutsInActivityWindow: providerCheckoutsInWindow.length,
                providerCheckoutsCompared: providerCheckouts.length,
                localPaymentsRead: localPayments.length,
                localPaidOrdersRead: paidOrders.length,
                divergences: divergences.length,
                byType
            },
            divergences
        };
    }

    private comparePair(
        findings: Array<{
            type: FinancialDivergenceType;
            local: LocalReconciliationPayment | null;
            provider: AbacateCheckout | null;
            orderUuid: string | null;
            providerCheckoutId: string | null;
        }>,
        local: LocalReconciliationPayment,
        provider: AbacateCheckout
    ) {
        const add = (type: FinancialDivergenceType) =>
            findings.push({
                type,
                local,
                provider,
                orderUuid: local.orderUuid,
                providerCheckoutId: provider.id
            });
        if (provider.externalId !== local.orderUuid) add("EXTERNAL_ID_MISMATCH");
        if (local.providerCheckoutId !== null && provider.id !== local.providerCheckoutId) {
            add("PROVIDER_ID_MISMATCH");
        }
        if (
            provider.amount !== local.expectedAmountInCents ||
            (FINANCIAL_PROVIDER_STATUSES.has(provider.status) &&
                provider.paidAmount !== local.paidAmountInCents)
        ) {
            add("AMOUNT_MISMATCH");
        }
        if (!this.statusesAgree(provider.status, local.status)) add("STATUS_MISMATCH");
        const localFinancialAt = provider.status === "REFUNDED" ? local.refundedAt : local.paidAt;
        if (
            FINANCIAL_PROVIDER_STATUSES.has(provider.status) &&
            this.timestampsDiverge(provider.updatedAt, localFinancialAt)
        ) {
            add("TIME_MISMATCH");
        }
    }

    private statusesAgree(provider: string, local: string) {
        if (provider === "PAID") return local === PaymentStatus.PAID;
        if (provider === "REFUNDED") return local === PaymentStatus.REFUNDED;
        return !FINANCIAL_LOCAL_STATUSES.has(local);
    }

    private orderAndPaymentStatusesAgree(order: string, payment: string) {
        if (payment === PaymentStatus.PAID) {
            return FINANCIAL_ORDER_STATUSES.some((status) => status === order);
        }
        return order === OrderStatus.CANCELLED;
    }

    private timestampsDiverge(providerUpdatedAt: string | undefined, localPaidAt: Date | null) {
        if (!providerUpdatedAt || !localPaidAt) return true;
        const providerTime = Date.parse(providerUpdatedAt);
        if (!Number.isFinite(providerTime)) return true;
        return (
            Math.abs(providerTime - localPaidAt.getTime()) >
            (this.options.timestampToleranceMs ?? 300_000)
        );
    }

    private providerCheckoutInWindow(checkout: AbacateCheckout) {
        const updatedAt = checkout.updatedAt ? Date.parse(checkout.updatedAt) : Number.NaN;
        if (!Number.isFinite(updatedAt)) return false;
        return (
            updatedAt >= this.options.periodFrom.getTime() &&
            updatedAt < this.options.periodTo.getTime()
        );
    }

    private present(finding: {
        type: FinancialDivergenceType;
        local: LocalReconciliationPayment | null;
        provider: AbacateCheckout | null;
        orderUuid: string | null;
        providerCheckoutId: string | null;
    }): FinancialDivergence {
        const fingerprint = createHash("sha256")
            .update(
                [finding.type, finding.orderUuid ?? "-", finding.providerCheckoutId ?? "-"].join(
                    ":"
                )
            )
            .digest("hex")
            .slice(0, 20);
        const events = this.options.resolutions?.[fingerprint] ?? [];
        const resolution = events.at(-1);
        return {
            fingerprint,
            type: finding.type,
            orderUuid: safeUuid(finding.orderUuid),
            providerCheckoutId: safeProviderId(finding.providerCheckoutId),
            local: finding.local
                ? {
                      orderStatus: finding.local.orderStatus,
                      paymentStatus: finding.local.status,
                      expectedAmountInCents: finding.local.expectedAmountInCents,
                      paidAmountInCents: finding.local.paidAmountInCents,
                      paidAt: finding.local.paidAt?.toISOString() ?? null,
                      refundedAt: finding.local.refundedAt?.toISOString() ?? null,
                      updatedAt: finding.local.updatedAt.toISOString()
                  }
                : null,
            provider: finding.provider
                ? {
                      externalId: safeUuid(finding.provider.externalId),
                      status: safeProviderStatus(finding.provider.status),
                      amountInCents: finding.provider.amount,
                      paidAmountInCents: finding.provider.paidAmount,
                      updatedAt: safeInstant(finding.provider.updatedAt)
                  }
                : null,
            owner: resolution?.owner ?? this.options.owner,
            resolutionStatus: resolution?.status ?? "OPEN",
            resolutionCode: resolution?.resolutionCode ?? null,
            auditReference: resolution?.auditReference ?? null,
            resolutionUpdatedAt: resolution?.at ?? null
        };
    }

    private validateResolutions(registry: ResolutionRegistry) {
        for (const [fingerprint, events] of Object.entries(registry)) {
            if (!/^[a-f0-9]{20}$/.test(fingerprint) || !Array.isArray(events)) {
                throw new Error("Registro de resolucoes invalido");
            }
            let previous = 0;
            for (const event of events) {
                const at = Date.parse(event.at);
                if (
                    !Number.isFinite(at) ||
                    at < previous ||
                    !/^[A-Za-z0-9_.:/-]{2,80}$/.test(event.owner) ||
                    !["OPEN", "INVESTIGATING", "RESOLVED"].includes(event.status) ||
                    (event.auditReference !== undefined &&
                        !/^(INC|CASE|TICKET|OPS)[-:/][A-Z0-9_-]{1,100}$/.test(
                            event.auditReference
                        )) ||
                    (event.resolutionCode !== undefined &&
                        !RESOLUTION_CODES.has(event.resolutionCode)) ||
                    (event.status === "RESOLVED" && !event.resolutionCode)
                ) {
                    throw new Error("Evento de resolucao invalido");
                }
                previous = at;
            }
        }
    }
}

function safeUuid(value: string | null) {
    if (!value) return null;
    return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value)
        ? value
        : null;
}

function safeProviderId(value: string | null) {
    if (!value) return null;
    if (/^bill_[A-Za-z0-9]{1,100}$/.test(value)) return value;
    return `sha256:${createHash("sha256").update(value).digest("hex").slice(0, 20)}`;
}

function safeProviderStatus(value: string) {
    return ["PENDING", "EXPIRED", "CANCELLED", "PAID", "REFUNDED"].includes(value)
        ? value
        : "UNKNOWN";
}

function safeInstant(value: string | undefined) {
    if (!value) return null;
    const instant = Date.parse(value);
    return Number.isFinite(instant) ? new Date(instant).toISOString() : null;
}
