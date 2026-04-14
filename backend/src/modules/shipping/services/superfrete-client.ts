import { AppError } from "../../../core/errors/app-error";

type SuperFreteRequestOptions = {
    method: "GET" | "POST";
    path: string;
    body?: unknown;
};

export type SuperFreteCalculatorPayload = {
    from: {
        postal_code: string;
    };
    to: {
        postal_code: string;
    };
    services: string;
    options: {
        own_hand: boolean;
        receipt: boolean;
        insurance_value: number;
        use_insurance_value: boolean;
    };
    package: {
        height: number;
        width: number;
        length: number;
        weight: number;
    };
};

type RecipientPayload = {
    name: string;
    address: string;
    number: string;
    complement?: string;
    district: string;
    city: string;
    state_abbr: string;
    postal_code: string;
    document: string;
    email?: string;
};

export type SuperFreteCartPayload = {
    from: {
        name: string;
        address: string;
        number: string;
        complement?: string;
        district: string;
        city: string;
        state_abbr: string;
        postal_code: string;
        document?: string;
    };
    to: RecipientPayload;
    service: number;
    products: Array<{
        name: string;
        quantity: number;
        unitary_value: number;
    }>;
    volumes: {
        height: number;
        width: number;
        length: number;
        weight: number;
    };
    options: {
        insurance_value: number | null;
        receipt: boolean;
        own_hand: boolean;
        non_commercial: boolean;
    };
    platform?: string;
    url?: string;
    tag?: string;
};

type SuperFreteClientConfig = {
    token: string;
    userAgent: string;
    baseUrl: string;
    timeoutMs: number;
};

function normalizePostalCode(value: string) {
    return value.replace(/\D/g, "");
}

function normalizeDocument(value?: string) {
    return value?.replace(/\D/g, "");
}

export class SuperFreteClient {
    public constructor(private readonly config: SuperFreteClientConfig) {}

    public static fromEnv() {
        return new SuperFreteClient({
            token: process.env.SUPERFRETE_TOKEN ?? "",
            userAgent: process.env.SUPERFRETE_USER_AGENT ?? "",
            baseUrl: process.env.SUPERFRETE_BASE_URL ?? "https://sandbox.superfrete.com/api/v0",
            timeoutMs: Number(process.env.SUPERFRETE_TIMEOUT_MS ?? 15000)
        });
    }

    public calculateQuote(payload: SuperFreteCalculatorPayload) {
        return this.request({
            method: "POST",
            path: "/calculator",
            body: payload
        });
    }

    public createCart(payload: SuperFreteCartPayload) {
        return this.request({
            method: "POST",
            path: "/cart",
            body: payload
        });
    }

    public checkout(orders: string[]) {
        return this.request({
            method: "POST",
            path: "/checkout",
            body: {
                orders
            }
        });
    }

    public getOrderInfo(orderId: string) {
        return this.request({
            method: "GET",
            path: `/order/info/${orderId}`
        });
    }

    public cancelOrder(orderId: string) {
        return this.request({
            method: "POST",
            path: "/order/cancel",
            body: {
                order: {
                    id: orderId,
                    reason: "Cancelado pela integracao"
                }
            }
        });
    }

    private ensureConfigured() {
        if (!this.config.token || !this.config.userAgent) {
            throw AppError.serviceUnavailable("Configuracao do SuperFrete incompleta");
        }
    }

    private async request({ method, path, body }: SuperFreteRequestOptions): Promise<unknown> {
        this.ensureConfigured();

        const response = await fetch(`${this.config.baseUrl}${path}`, {
            method,
            headers: {
                Authorization: `Bearer ${this.config.token}`,
                "User-Agent": this.config.userAgent,
                accept: "application/json",
                "content-type": "application/json"
            },
            body: body ? JSON.stringify(body) : undefined,
            signal: AbortSignal.timeout(this.config.timeoutMs)
        }).catch((error: Error) => {
            throw AppError.serviceUnavailable(
                `Falha ao comunicar com o SuperFrete: ${error.message}`
            );
        });

        const text = await response.text();
        let data: unknown = null;

        if (text) {
            try {
                data = JSON.parse(text);
            } catch {
                data = text;
            }
        }

        if (!response.ok) {
            const detail =
                typeof data === "string"
                    ? data
                    : JSON.stringify(data ?? { status: response.status }).slice(0, 500);

            throw AppError.serviceUnavailable(
                `SuperFrete respondeu com erro ${response.status}: ${detail}`
            );
        }

        return data;
    }
}

export function normalizeSuperFreteRecipient(input: {
    name: string;
    address: string;
    number: string;
    complement?: string | null;
    district: string;
    city: string;
    stateAbbr: string;
    postalCode: string;
    document: string;
    email?: string;
}): RecipientPayload {
    return {
        name: input.name,
        address: input.address,
        number: input.number,
        complement: input.complement ?? undefined,
        district: input.district || "NA",
        city: input.city,
        state_abbr: input.stateAbbr.toUpperCase(),
        postal_code: normalizePostalCode(input.postalCode),
        document: normalizeDocument(input.document) ?? "",
        email: input.email
    };
}
