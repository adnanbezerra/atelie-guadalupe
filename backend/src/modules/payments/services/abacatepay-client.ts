import { AppError } from "../../../core/errors/app-error";
import { expectedAbacatePayDevMode } from "../../../config/env";

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
};

export class AbacatePayClient {
    public constructor(
        private readonly config: {
            apiKey: string;
            baseUrl: string;
            timeoutMs: number;
            expectedDevMode?: boolean;
        }
    ) {}

    public static fromEnv() {
        return new AbacatePayClient({
            apiKey: process.env.ABACATEPAY_API_KEY ?? "",
            baseUrl: process.env.ABACATEPAY_BASE_URL ?? "https://api.abacatepay.com/v2",
            timeoutMs: Number(process.env.ABACATEPAY_TIMEOUT_MS ?? 15000),
            expectedDevMode: expectedAbacatePayDevMode()
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
        let after: string | null = null;
        const visitedCursors = new Set<string>();
        do {
            const query = new URLSearchParams({ externalId, limit: "100" });
            if (after) query.set("after", after);
            const response = await this.requestEnvelope<AbacateCheckout[]>({
                method: "GET",
                path: `/checkouts/list?${query.toString()}`
            });
            const checkout = response.data.find((item) => item.externalId === externalId);
            if (checkout) return checkout;
            if (!response.pagination?.hasMore || !response.pagination.next) return null;
            if (visitedCursors.has(response.pagination.next)) {
                throw AppError.serviceUnavailable(
                    "AbacatePay retornou cursor de paginacao repetido"
                );
            }
            visitedCursors.add(response.pagination.next);
            after = response.pagination.next;
        } while (after);
        return null;
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
        }).catch((error: Error) => {
            throw AppError.serviceUnavailable(
                `Falha ao comunicar com a AbacatePay: ${error.message}`
            );
        });

        const payload = (await response.json().catch(() => null)) as
            | AbacatePaginatedEnvelope<T>
            | null;
        if (!response.ok || !payload?.success || payload.data === null) {
            throw AppError.serviceUnavailable(
                `AbacatePay respondeu com erro ${response.status}: ${payload?.error ?? "resposta invalida"}`
            );
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
