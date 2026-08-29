import { AppError } from "../../../core/errors/app-error";
import { expectedAbacatePayDevMode } from "../../../config/env";
import {
    observeProviderRequest,
    ProviderRequestObservation,
    safelyObserveProviderRequest
} from "../../observability/checkout-telemetry";

type RequestOptions = { method: "GET" | "POST"; path: string; body?: unknown };

type AbacateEnvelope<T> = { data: T; success: boolean; error: string | null };
type AbacatePaginatedEnvelope<T> = AbacateEnvelope<T> & {
    pagination?: { hasMore?: boolean; next?: string | null };
};

export type AbacateProduct = { id: string; externalId: string; name: string; price: number };
export type AbacateCheckout = {
    id: string;
    externalId: string;
    url: string;
    amount: number;
    paidAmount: number | null;
    status: string;
    devMode?: boolean;
    metadata?: Record<string, unknown>;
    createdAt?: string;
    updatedAt?: string;
};

export type AbacateCheckoutListFilters = {
    status?: "PENDING" | "EXPIRED" | "CANCELLED" | "PAID" | "REFUNDED";
};

export class AbacatePayClient {
    public constructor(
        private readonly config: {
            apiKey: string;
            baseUrl: string;
            timeoutMs: number;
            expectedDevMode?: boolean;
            maxCheckoutListRecords?: number;
            maxCheckoutListPages?: number;
        },
        private readonly observer: (
            observation: ProviderRequestObservation
        ) => void = observeProviderRequest
    ) {}

    public static fromEnv() {
        return new AbacatePayClient({
            apiKey: process.env.ABACATEPAY_API_KEY ?? "",
            baseUrl: process.env.ABACATEPAY_BASE_URL ?? "https://api.abacatepay.com/v2",
            timeoutMs: Number(process.env.ABACATEPAY_TIMEOUT_MS ?? 15000),
            expectedDevMode: expectedAbacatePayDevMode(),
            maxCheckoutListRecords: Number(
                process.env.ABACATEPAY_RECONCILIATION_MAX_RECORDS ?? 100000
            ),
            maxCheckoutListPages: Number(process.env.ABACATEPAY_RECONCILIATION_MAX_PAGES ?? 2000)
        });
    }

    public createProduct(input: {
        externalId: string;
        name: string;
        price: number;
        description?: string;
    }) {
        return this.request<AbacateProduct>({
            method: "POST",
            path: "/products/create",
            body: { ...input, currency: "BRL" }
        });
    }

    public createCheckout(input: {
        externalId: string;
        items: Array<{ id: string; quantity: number }>;
        methods: Array<"PIX" | "CARD">;
        returnUrl?: string;
        completionUrl?: string;
        metadata: Record<string, unknown>;
    }) {
        return this.request<AbacateCheckout>({
            method: "POST",
            path: "/checkouts/create",
            body: input
        });
    }

    public async findCheckoutByExternalId(externalId: string) {
        const checkouts = await this.listCheckouts({ externalId });
        if (checkouts.length > 1) {
            throw AppError.serviceUnavailable(
                "AbacatePay retornou mais de um checkout para o mesmo externalId"
            );
        }
        return checkouts[0] ?? null;
    }

    public async listCheckouts(filters: AbacateCheckoutListFilters & { externalId?: string } = {}) {
        let after: string | null = null;
        const visitedCursors = new Set<string>();
        const visitedCheckoutIds = new Set<string>();
        const checkouts: AbacateCheckout[] = [];
        const maxRecords = this.config.maxCheckoutListRecords ?? 100000;
        const maxPages = this.config.maxCheckoutListPages ?? 2000;
        if (
            !Number.isInteger(maxRecords) ||
            maxRecords <= 0 ||
            !Number.isInteger(maxPages) ||
            maxPages <= 0
        ) {
            throw AppError.serviceUnavailable("Limite da listagem AbacatePay invalido");
        }
        let pages = 0;
        do {
            pages += 1;
            if (pages > maxPages) {
                throw AppError.serviceUnavailable(
                    "Listagem AbacatePay excedeu limite operacional de paginas"
                );
            }
            const query = new URLSearchParams({ limit: "100" });
            if (filters.externalId) query.set("externalId", filters.externalId);
            if (filters.status) query.set("status", filters.status);
            if (after) query.set("after", after);
            const response = await this.requestEnvelope<AbacateCheckout[]>({
                method: "GET",
                path: `/checkouts/list?${query.toString()}`
            });
            for (const checkout of response.data) {
                if (visitedCheckoutIds.has(checkout.id)) {
                    throw AppError.serviceUnavailable(
                        "AbacatePay repetiu checkout durante paginacao"
                    );
                }
                visitedCheckoutIds.add(checkout.id);
                if (!filters.externalId || checkout.externalId === filters.externalId) {
                    checkouts.push(checkout);
                }
                if (visitedCheckoutIds.size > maxRecords) {
                    throw AppError.serviceUnavailable(
                        "Listagem AbacatePay excedeu limite operacional de registros"
                    );
                }
            }
            if (!response.pagination?.hasMore) return checkouts;
            if (!response.pagination.next) {
                throw AppError.serviceUnavailable(
                    "AbacatePay informou mais paginas sem proximo cursor"
                );
            }
            if (visitedCursors.has(response.pagination.next)) {
                throw AppError.serviceUnavailable(
                    "AbacatePay retornou cursor de paginacao repetido"
                );
            }
            visitedCursors.add(response.pagination.next);
            after = response.pagination.next;
        } while (after);
        return checkouts;
    }

    public refundCheckout(id: string, reason?: string) {
        return this.request<{ refundPublicId: string }>({
            method: "POST",
            path: "/checkouts/refund",
            body: { id, reason }
        });
    }

    private async request<T>({ method, path, body }: RequestOptions): Promise<T> {
        return (await this.requestEnvelope<T>({ method, path, body })).data;
    }

    private async requestEnvelope<T>({
        method,
        path,
        body
    }: RequestOptions): Promise<AbacatePaginatedEnvelope<T>> {
        const startedAt = Date.now();
        try {
            const result = await this.performRequest<T>({ method, path, body });
            safelyObserveProviderRequest(this.observer, {
                provider: "ABACATEPAY",
                operation: `${method} ${path.split("?")[0]}`,
                result: "success",
                durationMs: Date.now() - startedAt
            });
            return result;
        } catch (error) {
            safelyObserveProviderRequest(this.observer, {
                provider: "ABACATEPAY",
                operation: `${method} ${path.split("?")[0]}`,
                result: "error",
                durationMs: Date.now() - startedAt,
                statusCode: statusCode(error)
            });
            throw error;
        }
    }

    private async performRequest<T>({
        method,
        path,
        body
    }: RequestOptions): Promise<AbacatePaginatedEnvelope<T>> {
        if (!this.config.apiKey) {
            throw AppError.serviceUnavailable("Configuracao da AbacatePay incompleta");
        }

        const response = await fetch(`${this.config.baseUrl}${path}`, {
            method,
            headers: {
                Authorization: `Bearer ${this.config.apiKey}`,
                accept: "application/json",
                "content-type": "application/json"
            },
            body: body === undefined ? undefined : JSON.stringify(body),
            signal: AbortSignal.timeout(this.config.timeoutMs)
        }).catch(() => {
            throw AppError.serviceUnavailable("Falha ao comunicar com a AbacatePay");
        });

        const payload = (await response
            .json()
            .catch(() => null)) as AbacatePaginatedEnvelope<T> | null;
        if (!response.ok || !payload?.success || payload.data === null) {
            throw AppError.serviceUnavailable(`AbacatePay respondeu com erro ${response.status}`);
        }
        if (path.startsWith("/checkouts/") && path !== "/checkouts/refund") {
            this.assertExpectedDevMode(payload, path.startsWith("/checkouts/list"));
        }
        return payload;
    }

    private assertExpectedDevMode(payload: unknown, allowEmptyList: boolean) {
        const expected = this.config.expectedDevMode ?? expectedAbacatePayDevMode();
        const modes = this.developmentModes(payload);
        const data = (payload as { data?: unknown }).data;
        if (allowEmptyList && Array.isArray(data) && data.length === 0) return;
        if (modes.length === 0 || modes.some((mode) => mode !== expected)) {
            throw AppError.serviceUnavailable(
                "AbacatePay respondeu com devMode ausente ou diferente do ambiente esperado"
            );
        }
    }

    private developmentModes(value: unknown): boolean[] {
        if (Array.isArray(value)) return value.flatMap((item) => this.developmentModes(item));
        if (!value || typeof value !== "object") return [];
        const record = value as Record<string, unknown>;
        const own = typeof record.devMode === "boolean" ? [record.devMode] : [];
        return [...own, ...this.developmentModes(record.data)];
    }
}

function statusCode(error: unknown) {
    if (!error || typeof error !== "object" || !("statusCode" in error)) return undefined;
    const value = (error as { statusCode?: unknown }).statusCode;
    return typeof value === "number" ? value : undefined;
}
