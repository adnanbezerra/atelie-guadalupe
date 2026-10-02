import { AppError } from "../../../core/errors/app-error";
import {
    observeProviderRequest,
    ProviderRequestObservation,
    safelyObserveProviderRequest
} from "../../observability/checkout-telemetry";

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
    phone?: string;
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
    public constructor(
        private readonly config: SuperFreteClientConfig,
        private readonly observer: (
            observation: ProviderRequestObservation
        ) => void = observeProviderRequest
    ) {}

    public static fromEnv() {
        return new SuperFreteClient({
            token: process.env.SUPERFRETE_TOKEN ?? "",
            userAgent: process.env.SUPERFRETE_USER_AGENT ?? "",
            baseUrl:
                process.env.SUPERFRETE_BASE_URL ??
                (process.env.NODE_ENV === "production"
                    ? ""
                    : "https://sandbox.superfrete.com/api/v0"),
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
                    description: "Cancelado pela integracao"
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
        const startedAt = Date.now();
        try {
            const result = await this.performRequest({ method, path, body });
            safelyObserveProviderRequest(this.observer, {
                provider: "SUPERFRETE",
                operation: `${method} ${path}`,
                result: "success",
                durationMs: Date.now() - startedAt
            });
            return result;
        } catch (error) {
            safelyObserveProviderRequest(this.observer, {
                provider: "SUPERFRETE",
                operation: `${method} ${path}`,
                result: "error",
                durationMs: Date.now() - startedAt,
                statusCode: statusCode(error)
            });
            throw error;
        }
    }

    private async performRequest({ method, path, body }: SuperFreteRequestOptions) {
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
        }).catch(() => {
            throw AppError.serviceUnavailable("Falha ao comunicar com o SuperFrete");
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
            throw AppError.serviceUnavailable(`SuperFrete respondeu com erro ${response.status}`);
        }

        return data;
    }
}

function statusCode(error: unknown) {
    if (!error || typeof error !== "object" || !("statusCode" in error)) return undefined;
    const value = (error as { statusCode?: unknown }).statusCode;
    return typeof value === "number" ? value : undefined;
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
    phone?: string | null;
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
        phone: input.phone?.replace(/\D/g, "") || undefined,
        email: input.email
    };
}

export function validateSuperFreteRecipient(
    input: Parameters<typeof normalizeSuperFreteRecipient>[0],
    serviceCode: number
): string | null {
    const recipient = normalizeSuperFreteRecipient(input);
    const limits: Array<[string, string | undefined, number]> = [
        ["nome", recipient.name, 50],
        ["endereco", recipient.address, 50],
        ["numero", recipient.number, 10],
        ["complemento", recipient.complement, 20],
        ["bairro", recipient.district, 50],
        ["cidade", recipient.city, 50]
    ];
    const exceeded = limits.find(([, value, max]) => (value?.length ?? 0) > max);
    if (exceeded) {
        return `O campo ${exceeded[0]} excede o limite de ${exceeded[2]} caracteres do SuperFrete`;
    }

    if (!recipient.name.trim().includes(" ")) {
        return "Informe nome e sobrenome para gerar a etiqueta";
    }
    if (!/^\d{8}$/.test(recipient.postal_code)) {
        return "Informe um CEP valido para gerar a etiqueta";
    }
    if (!/^[A-Z]{2}$/.test(recipient.state_abbr)) {
        return "Informe a sigla do estado com 2 letras para gerar a etiqueta";
    }
    if (!/^\d{11}$|^\d{14}$/.test(recipient.document)) {
        return "Informe um CPF ou CNPJ para gerar a etiqueta";
    }
    if (serviceCode === 33 && !/^\d{11}$/.test(recipient.phone ?? "")) {
        return "Informe um telefone com 11 digitos para usar o servico J&T";
    }

    return null;
}
