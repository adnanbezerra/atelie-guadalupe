import { AppError } from "../../../core/errors/app-error";

type RequestOptions = { method: "GET" | "POST"; path: string; body?: unknown };

type AbacateEnvelope<T> = { data: T; success: boolean; error: string | null };

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
            production?: boolean;
        }
    ) {}

    public static fromEnv() {
        return new AbacatePayClient({
            apiKey: process.env.ABACATEPAY_API_KEY ?? "",
            baseUrl: process.env.ABACATEPAY_BASE_URL ?? "https://api.abacatepay.com/v2",
            timeoutMs: Number(process.env.ABACATEPAY_TIMEOUT_MS ?? 15000),
            production: process.env.NODE_ENV === "production"
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
        const data = await this.request<AbacateCheckout[] | { data?: AbacateCheckout[] }>({
            method: "GET",
            path: "/checkouts/list"
        });
        const checkouts = Array.isArray(data) ? data : (data.data ?? []);
        return checkouts.find((checkout) => checkout.externalId === externalId) ?? null;
    }

    public refundCheckout(id: string, reason?: string) {
        return this.request<{ refundPublicId: string }>({
            method: "POST",
            path: "/checkouts/refund",
            body: { id, reason }
        });
    }

    private async request<T>({ method, path, body }: RequestOptions): Promise<T> {
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

        const payload = (await response.json().catch(() => null)) as AbacateEnvelope<T> | null;
        if (!response.ok || !payload?.success || payload.data === null) {
            throw AppError.serviceUnavailable(
                `AbacatePay respondeu com erro ${response.status}: ${payload?.error ?? "resposta invalida"}`
            );
        }
        const production = this.config.production ?? process.env.NODE_ENV === "production";
        if (production && this.hasDevelopmentMode(payload)) {
            throw AppError.serviceUnavailable(
                "AbacatePay respondeu com dados de ambiente de desenvolvimento em producao"
            );
        }
        return payload.data;
    }

    private hasDevelopmentMode(value: unknown): boolean {
        if (Array.isArray(value)) return value.some((item) => this.hasDevelopmentMode(item));
        if (!value || typeof value !== "object") return false;
        const record = value as Record<string, unknown>;
        return record.devMode === true || this.hasDevelopmentMode(record.data);
    }
}
