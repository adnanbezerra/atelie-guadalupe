import { isIP } from "node:net";
import { z } from "zod";
import {
    minimumFulfillmentTransactionTimeoutMs,
    minimumFulfillmentWorkerLockTimeoutMs
} from "../core/config/fulfillment-timing";

const emptyToUndefined = (value: unknown) =>
    typeof value === "string" && value.trim() === "" ? undefined : value;

const optionalString = z.preprocess(emptyToUndefined, z.string().trim().min(1).optional());
const optionalUrl = z.preprocess(emptyToUndefined, z.url().optional());
const optionalEmail = z.preprocess(emptyToUndefined, z.email().optional());
const positiveInteger = (defaultValue: number) =>
    z.coerce.number().int().positive().default(defaultValue);
const enabledFlag = z.enum(["true", "false"]).optional();
const checkoutEnabledFlag = z.enum(["true", "false"]).optional();
const checkoutRolloutMode = z.enum(["ALLOWLIST", "PUBLIC"]).optional();
const expectedDevModeFlag = z.enum(["true", "false"]).optional();
const expectedSuperFreteEnvironment = z.enum(["sandbox", "production"]).optional();
const checkoutAllowedUsers = z.preprocess(emptyToUndefined, z.string().trim().max(3699).optional());

export const SUPERFRETE_PRODUCTION_URL = "https://api.superfrete.com/api/v0";
export const SUPERFRETE_SANDBOX_URL = "https://sandbox.superfrete.com/api/v0";
export const ABACATEPAY_V2_URL = "https://api.abacatepay.com/v2";
const PRODUCTION_DATABASE_SSL_MODES = new Set(["require", "verify-ca", "verify-full"]);
const UNSAFE_JWT_SECRETS = ["change-me", "dev-secret", "test-secret", "production-secret"];

function isPrivateHostname(hostname: string) {
    const normalized = hostname
        .toLowerCase()
        .replace(/^\[|\]$/g, "")
        .replace(/\.$/, "");
    if (
        normalized === "localhost" ||
        normalized.endsWith(".localhost") ||
        normalized.endsWith(".local") ||
        normalized.endsWith(".internal")
    ) {
        return true;
    }

    if (isIP(normalized) === 4) {
        const [first, second] = normalized.split(".").map(Number);
        return (
            first === 0 ||
            first === 10 ||
            first === 127 ||
            (first === 100 && second >= 64 && second <= 127) ||
            (first === 169 && second === 254) ||
            (first === 172 && second >= 16 && second <= 31) ||
            (first === 192 && second === 168) ||
            first >= 224
        );
    }

    return (
        isIP(normalized) === 6 &&
        (normalized === "::" ||
            normalized === "::1" ||
            normalized.startsWith("::ffff:") ||
            normalized.startsWith("fc") ||
            normalized.startsWith("fd") ||
            normalized.startsWith("fe8") ||
            normalized.startsWith("fe9") ||
            normalized.startsWith("fea") ||
            normalized.startsWith("feb"))
    );
}

function publicProductionUrlIssue(value: string) {
    const parsed = z.url().safeParse(value);
    if (!parsed.success) return "URL invalida";
    const url = new URL(parsed.data);
    if (url.protocol !== "https:") return "deve usar HTTPS em producao";
    if (url.username || url.password) return "nao deve conter credenciais";
    if (isPrivateHostname(url.hostname)) return "nao pode apontar para host local ou privado";
    if (url.hostname.toLowerCase().split(".").includes("sandbox")) {
        return "nao pode apontar para sandbox em producao";
    }
    return null;
}

function operationalProductionUrlIssue(value: string) {
    const publicIssue = publicProductionUrlIssue(value);
    if (publicIssue) return publicIssue;
    const hostname = new URL(value).hostname.toLowerCase().replace(/\.$/, "");
    if (
        hostname === "example.com" ||
        hostname.endsWith(".example.com") ||
        hostname.endsWith(".example") ||
        hostname.endsWith(".invalid") ||
        hostname.endsWith(".test")
    ) {
        return "nao pode usar dominio reservado ou placeholder em producao";
    }
    return null;
}

export function normalizeDatabaseHostname(hostname: string) {
    return hostname
        .trim()
        .toLowerCase()
        .replace(/^\[|\]$/g, "")
        .replace(/\.$/, "");
}

function isInternalDatabaseHostname(hostname: string) {
    const normalized = normalizeDatabaseHostname(hostname);
    if (normalized === "localhost" || normalized.endsWith(".localhost")) return false;
    if (isIP(normalized) === 4) {
        const [first, second] = normalized.split(".").map(Number);
        return (
            first === 10 ||
            (first === 100 && second >= 64 && second <= 127) ||
            (first === 172 && second >= 16 && second <= 31) ||
            (first === 192 && second === 168)
        );
    }
    if (isIP(normalized) === 6) {
        return normalized.startsWith("fc") || normalized.startsWith("fd");
    }
    return (
        normalized.endsWith(".internal") ||
        normalized.endsWith(".local") ||
        (!normalized.includes(".") && /^[a-z0-9](?:[a-z0-9_-]*[a-z0-9])?$/i.test(normalized))
    );
}

export function productionDatabaseUrlIssue(
    value: string,
    environment: {
        PRODUCTION_DATABASE_ALLOW_INSECURE_INTERNAL?: string;
        PRODUCTION_DATABASE_EXPECTED_INTERNAL_HOST?: string;
    } = process.env
) {
    let url: URL;
    try {
        url = new URL(value);
    } catch {
        return "deve ser uma URL PostgreSQL valida";
    }
    if (url.protocol !== "postgresql:" && url.protocol !== "postgres:") {
        return "deve usar protocolo PostgreSQL em producao";
    }
    const allowInsecureInternal = environment.PRODUCTION_DATABASE_ALLOW_INSECURE_INTERNAL;
    const expectedHost = environment.PRODUCTION_DATABASE_EXPECTED_INTERNAL_HOST?.trim();
    if (
        allowInsecureInternal !== undefined &&
        allowInsecureInternal !== "true" &&
        allowInsecureInternal !== "false"
    ) {
        return "PRODUCTION_DATABASE_ALLOW_INSECURE_INTERNAL deve ser true ou false";
    }
    const sslModes = url.searchParams.getAll("sslmode");
    if (sslModes.length !== 1) {
        return "deve exigir TLS com sslmode=require, verify-ca ou verify-full em producao";
    }
    if (PRODUCTION_DATABASE_SSL_MODES.has(sslModes[0])) {
        if (allowInsecureInternal === "true" || expectedHost) {
            return "configuracao de banco interno sem TLS deve estar ausente quando TLS esta ativo";
        }
        return null;
    }
    if (sslModes[0] !== "disable") {
        return "deve exigir TLS com sslmode=require, verify-ca ou verify-full em producao";
    }
    if (allowInsecureInternal !== "true") {
        return "sslmode=disable exige PRODUCTION_DATABASE_ALLOW_INSECURE_INTERNAL=true";
    }
    const normalizedExpectedHost = expectedHost
        ? normalizeDatabaseHostname(expectedHost)
        : undefined;
    const actualHost = normalizeDatabaseHostname(url.hostname);
    if (!normalizedExpectedHost || actualHost !== normalizedExpectedHost) {
        return "sslmode=disable exige host igual a PRODUCTION_DATABASE_EXPECTED_INTERNAL_HOST";
    }
    if (!isInternalDatabaseHostname(actualHost)) {
        return "sslmode=disable permitido somente para host privado ou interno";
    }
    return null;
}

function productionJwtSecretIssue(value: string) {
    if (Buffer.byteLength(value, "utf8") < 32) return "deve possuir pelo menos 32 bytes";
    const normalized = value.toLowerCase();
    if (UNSAFE_JWT_SECRETS.some((unsafe) => normalized.includes(unsafe))) {
        return "nao pode usar valor conhecido de desenvolvimento ou placeholder";
    }
    if (new Set(value).size < 8) return "possui pouca variacao de caracteres";
    return null;
}

function emailSenderIssue(value: string) {
    const bracketed = value.match(/^.+\s<([^<>]+)>$/);
    const address = bracketed?.[1] ?? value;
    return z.email().safeParse(address).success ? null : "deve conter remetente de email valido";
}

function checkoutAllowedUsersIssue(value: string | undefined) {
    if (!value) return null;
    const users = value.split(",").map((item) => item.trim().toLowerCase());
    if (users.length > 100) return "deve conter no maximo 100 UUIDs";
    if (users.some((item) => !z.uuid().safeParse(item).success)) {
        return "deve conter somente UUIDs separados por virgula";
    }
    if (new Set(users).size !== users.length) return "nao deve conter UUIDs duplicados";
    return null;
}

const envSchema = z
    .object({
        NODE_ENV: z.enum(["development", "test", "production"]).default("development"),
        PORT: z.coerce.number().int().min(1).max(65535).default(3000),
        DATABASE_URL: optionalString.refine(
            (value) => !value || /^postgres(?:ql)?:\/\//.test(value),
            "deve ser uma URL PostgreSQL"
        ),
        PRODUCTION_DATABASE_ALLOW_INSECURE_INTERNAL: enabledFlag,
        PRODUCTION_DATABASE_EXPECTED_INTERNAL_HOST: optionalString,
        JWT_SECRET: optionalString,
        JWT_EXPIRES_IN: z.string().trim().min(1).default("1d"),
        RATE_LIMIT_MAX: positiveInteger(120),
        RATE_LIMIT_TIME_WINDOW: z.string().trim().min(1).default("1 minute"),
        CORS_ORIGIN: optionalString.superRefine((value, context) => {
            if (!value) return;
            for (const origin of value.split(",").map((item) => item.trim())) {
                if (!z.url().safeParse(origin).success) {
                    context.addIssue({ code: "custom", message: `origem invalida: ${origin}` });
                }
            }
        }),
        MONGODB_URL: optionalString.refine(
            (value) => !value || /^mongodb(?:\+srv)?:\/\//.test(value),
            "deve ser uma URL MongoDB"
        ),
        MONGODB_DB_NAME: optionalString,
        MONGODB_NAME: optionalString,
        MEDIA_BASE_URL: optionalUrl,
        SUPERFRETE_BASE_URL: optionalUrl,
        SUPERFRETE_TOKEN: optionalString,
        SUPERFRETE_USER_AGENT: optionalString,
        SUPERFRETE_SERVICE_CODES: z
            .string()
            .regex(/^\d+(?:,\d+)*$/, "deve conter codigos numericos separados por virgula")
            .default("1,2,17"),
        SUPERFRETE_TIMEOUT_MS: positiveInteger(15000),
        SUPERFRETE_EXPECTED_ENVIRONMENT: expectedSuperFreteEnvironment,
        ABACATEPAY_BASE_URL: optionalUrl.default(ABACATEPAY_V2_URL),
        ABACATEPAY_API_KEY: optionalString,
        ABACATEPAY_RETURN_URL: optionalUrl,
        ABACATEPAY_COMPLETION_URL: optionalUrl,
        ABACATEPAY_WEBHOOK_SECRET: optionalString,
        ABACATEPAY_TIMEOUT_MS: positiveInteger(15000),
        ABACATEPAY_EXPECTED_DEV_MODE: expectedDevModeFlag,
        PAYMENT_LINK_PUBLIC_BASE_URL: optionalUrl,
        CHECKOUT_ENABLED: checkoutEnabledFlag,
        CHECKOUT_ROLLOUT_MODE: checkoutRolloutMode,
        CHECKOUT_ALLOWED_USER_UUIDS: checkoutAllowedUsers,
        CHECKOUT_OBSERVABILITY_ENABLED: z.enum(["true", "false"]).optional(),
        CHECKOUT_OBSERVABILITY_INTERVAL_MS: positiveInteger(60000),
        PAYMENT_PENDING_ALERT_MINUTES: positiveInteger(30),
        CHECKOUT_ALERT_CHANNEL: optionalString,
        CHECKOUT_ALERT_OWNER: optionalString,
        CHECKOUT_LOG_QUERY_URL: optionalUrl,
        CHECKOUT_RUNBOOK_URL: optionalUrl,
        FULFILLMENT_WORKER_ENABLED: enabledFlag,
        FULFILLMENT_WORKER_INTERVAL_MS: positiveInteger(30000),
        FULFILLMENT_WORKER_LOCK_TIMEOUT_MS: positiveInteger(300000),
        FULFILLMENT_WORKER_MAX_ATTEMPTS: positiveInteger(8),
        FULFILLMENT_TRANSACTION_TIMEOUT_MS: positiveInteger(70000),
        RESEND_API_KEY: optionalString,
        EMAIL_FROM: optionalString,
        EMAIL_REPLY_TO: optionalEmail,
        FRONTEND_URL: optionalUrl,
        EMAIL_WORKER_ENABLED: enabledFlag,
        EMAIL_WORKER_INTERVAL_MS: positiveInteger(15000),
        EMAIL_WORKER_LOCK_TIMEOUT_MS: positiveInteger(300000),
        SHIPPING_TRACKING_WORKER_ENABLED: enabledFlag,
        SHIPPING_TRACKING_WORKER_INTERVAL_MS: positiveInteger(60000),
        SHIPPING_TRACKING_POLL_INTERVAL_MS: positiveInteger(600000),
        SHIPPING_TRACKING_LOCK_TIMEOUT_MS: positiveInteger(300000)
    })
    .superRefine((environment, context) => {
        const allowedUsersIssue = checkoutAllowedUsersIssue(
            environment.CHECKOUT_ALLOWED_USER_UUIDS
        );
        if (allowedUsersIssue) {
            context.addIssue({
                code: "custom",
                path: ["CHECKOUT_ALLOWED_USER_UUIDS"],
                message: allowedUsersIssue
            });
        }
        if (environment.CHECKOUT_ROLLOUT_MODE === "ALLOWLIST") {
            if (!environment.CHECKOUT_ALLOWED_USER_UUIDS || allowedUsersIssue) {
                context.addIssue({
                    code: "custom",
                    path: ["CHECKOUT_ALLOWED_USER_UUIDS"],
                    message: "obrigatoria e valida no modo ALLOWLIST"
                });
            }
        } else if (environment.CHECKOUT_ALLOWED_USER_UUIDS) {
            context.addIssue({
                code: "custom",
                path: ["CHECKOUT_ALLOWED_USER_UUIDS"],
                message: "deve permanecer ausente fora do modo ALLOWLIST"
            });
        }

        const minimumFulfillmentTimeout = minimumFulfillmentTransactionTimeoutMs(
            environment.SUPERFRETE_TIMEOUT_MS
        );
        if (environment.FULFILLMENT_TRANSACTION_TIMEOUT_MS < minimumFulfillmentTimeout) {
            context.addIssue({
                code: "custom",
                path: ["FULFILLMENT_TRANSACTION_TIMEOUT_MS"],
                message: `deve ser no minimo ${minimumFulfillmentTimeout} (4 chamadas SuperFrete + 10000ms de margem)`
            });
        }
        const minimumWorkerLockTimeout = minimumFulfillmentWorkerLockTimeoutMs(
            environment.FULFILLMENT_TRANSACTION_TIMEOUT_MS
        );
        if (environment.FULFILLMENT_WORKER_LOCK_TIMEOUT_MS < minimumWorkerLockTimeout) {
            context.addIssue({
                code: "custom",
                path: ["FULFILLMENT_WORKER_LOCK_TIMEOUT_MS"],
                message: `deve ser no minimo ${minimumWorkerLockTimeout} (timeout transacional + 10000ms de margem)`
            });
        }

        const effectiveSuperFreteEnvironment =
            environment.SUPERFRETE_EXPECTED_ENVIRONMENT ??
            (environment.NODE_ENV === "production" ? undefined : "sandbox");
        const expectedSuperFreteUrl =
            effectiveSuperFreteEnvironment === "sandbox"
                ? SUPERFRETE_SANDBOX_URL
                : effectiveSuperFreteEnvironment === "production"
                  ? SUPERFRETE_PRODUCTION_URL
                  : undefined;
        const effectiveSuperFreteUrl =
            environment.SUPERFRETE_BASE_URL ??
            (environment.NODE_ENV === "production" ? undefined : SUPERFRETE_SANDBOX_URL);
        if (
            effectiveSuperFreteUrl &&
            expectedSuperFreteUrl &&
            effectiveSuperFreteUrl !== expectedSuperFreteUrl
        ) {
            context.addIssue({
                code: "custom",
                path: ["SUPERFRETE_BASE_URL"],
                message: `deve ser ${expectedSuperFreteUrl} quando SUPERFRETE_EXPECTED_ENVIRONMENT=${effectiveSuperFreteEnvironment}`
            });
        }

        if (environment.NODE_ENV === "test") return;

        const required = [
            "DATABASE_URL",
            "JWT_SECRET",
            "CORS_ORIGIN",
            "MONGODB_URL",
            "SUPERFRETE_TOKEN",
            "SUPERFRETE_USER_AGENT",
            "ABACATEPAY_API_KEY",
            "ABACATEPAY_RETURN_URL",
            "ABACATEPAY_COMPLETION_URL",
            "ABACATEPAY_WEBHOOK_SECRET",
            "PAYMENT_LINK_PUBLIC_BASE_URL",
            "RESEND_API_KEY",
            "EMAIL_FROM",
            "FRONTEND_URL"
        ] as const;

        for (const name of required) {
            if (!environment[name]) {
                context.addIssue({ code: "custom", path: [name], message: "obrigatoria" });
            }
        }
        if (!environment.MONGODB_DB_NAME && !environment.MONGODB_NAME) {
            context.addIssue({
                code: "custom",
                path: ["MONGODB_DB_NAME"],
                message: "MONGODB_DB_NAME ou MONGODB_NAME deve ser configurada"
            });
        }
        if (environment.NODE_ENV !== "production") return;

        if (!environment.SUPERFRETE_BASE_URL) {
            context.addIssue({
                code: "custom",
                path: ["SUPERFRETE_BASE_URL"],
                message: "obrigatoria em producao"
            });
        }
        if (environment.DATABASE_URL) {
            const message = productionDatabaseUrlIssue(environment.DATABASE_URL, environment);
            if (message) context.addIssue({ code: "custom", path: ["DATABASE_URL"], message });
        }
        if (environment.JWT_SECRET) {
            const message = productionJwtSecretIssue(environment.JWT_SECRET);
            if (message) context.addIssue({ code: "custom", path: ["JWT_SECRET"], message });
        }
        if (!environment.SUPERFRETE_EXPECTED_ENVIRONMENT) {
            context.addIssue({
                code: "custom",
                path: ["SUPERFRETE_EXPECTED_ENVIRONMENT"],
                message: "obrigatoria em producao"
            });
        }
        if (environment.ABACATEPAY_BASE_URL !== ABACATEPAY_V2_URL) {
            context.addIssue({
                code: "custom",
                path: ["ABACATEPAY_BASE_URL"],
                message: `deve ser ${ABACATEPAY_V2_URL} em producao`
            });
        }
        if (!environment.ABACATEPAY_EXPECTED_DEV_MODE) {
            context.addIssue({
                code: "custom",
                path: ["ABACATEPAY_EXPECTED_DEV_MODE"],
                message: "obrigatoria em producao"
            });
        }
        if (
            environment.ABACATEPAY_EXPECTED_DEV_MODE === "false" &&
            environment.ABACATEPAY_API_KEY?.toLowerCase().startsWith("abc_dev_")
        ) {
            context.addIssue({
                code: "custom",
                path: ["ABACATEPAY_API_KEY"],
                message: "chave de desenvolvimento nao permitida em producao"
            });
        }
        if (
            environment.ABACATEPAY_EXPECTED_DEV_MODE === "true" &&
            environment.ABACATEPAY_API_KEY &&
            !environment.ABACATEPAY_API_KEY.toLowerCase().startsWith("abc_dev_")
        ) {
            context.addIssue({
                code: "custom",
                path: ["ABACATEPAY_API_KEY"],
                message: "deve ser chave de desenvolvimento quando devMode esperado for true"
            });
        }

        if (!environment.CHECKOUT_ENABLED) {
            context.addIssue({
                code: "custom",
                path: ["CHECKOUT_ENABLED"],
                message: "obrigatoria em producao"
            });
        }
        if (!environment.CHECKOUT_ROLLOUT_MODE) {
            context.addIssue({
                code: "custom",
                path: ["CHECKOUT_ROLLOUT_MODE"],
                message: "obrigatoria em producao"
            });
        }
        for (const name of [
            "FULFILLMENT_WORKER_ENABLED",
            "EMAIL_WORKER_ENABLED",
            "SHIPPING_TRACKING_WORKER_ENABLED"
        ] as const) {
            if (!environment[name]) {
                context.addIssue({
                    code: "custom",
                    path: [name],
                    message: "obrigatoria em producao"
                });
            }
        }
        if (!environment.EMAIL_REPLY_TO) {
            context.addIssue({
                code: "custom",
                path: ["EMAIL_REPLY_TO"],
                message: "obrigatoria em producao"
            });
        }
        if (environment.EMAIL_FROM) {
            const message = emailSenderIssue(environment.EMAIL_FROM);
            if (message) context.addIssue({ code: "custom", path: ["EMAIL_FROM"], message });
        }
        if (environment.CHECKOUT_OBSERVABILITY_ENABLED !== "true") {
            context.addIssue({
                code: "custom",
                path: ["CHECKOUT_OBSERVABILITY_ENABLED"],
                message: "deve ser true em producao"
            });
        }
        for (const name of [
            "CHECKOUT_ALERT_CHANNEL",
            "CHECKOUT_ALERT_OWNER",
            "CHECKOUT_LOG_QUERY_URL",
            "CHECKOUT_RUNBOOK_URL"
        ] as const) {
            if (!environment[name]) {
                context.addIssue({
                    code: "custom",
                    path: [name],
                    message: "obrigatoria em producao"
                });
            }
        }
        for (const name of ["CHECKOUT_LOG_QUERY_URL", "CHECKOUT_RUNBOOK_URL"] as const) {
            const value = environment[name];
            if (!value) continue;
            const message = operationalProductionUrlIssue(value);
            if (message) context.addIssue({ code: "custom", path: [name], message });
        }

        const publicUrls = [
            "ABACATEPAY_RETURN_URL",
            "ABACATEPAY_COMPLETION_URL",
            "PAYMENT_LINK_PUBLIC_BASE_URL",
            "FRONTEND_URL"
        ] as const;
        for (const name of publicUrls) {
            const value = environment[name];
            if (!value) continue;
            const message = publicProductionUrlIssue(value);
            if (message) context.addIssue({ code: "custom", path: [name], message });
        }

        const corsOrigins = environment.CORS_ORIGIN?.split(",").map((item) => item.trim()) ?? [];
        for (const origin of corsOrigins) {
            const message = publicProductionUrlIssue(origin);
            if (message) context.addIssue({ code: "custom", path: ["CORS_ORIGIN"], message });
            if (!z.url().safeParse(origin).success) continue;
            const url = new URL(origin);
            if (`${url.origin}/` !== url.href) {
                context.addIssue({
                    code: "custom",
                    path: ["CORS_ORIGIN"],
                    message: `deve conter somente origens, sem caminho: ${origin}`
                });
            }
        }

        if (environment.FRONTEND_URL) {
            const frontendOrigin = new URL(environment.FRONTEND_URL).origin;
            for (const name of [
                "ABACATEPAY_RETURN_URL",
                "ABACATEPAY_COMPLETION_URL",
                "PAYMENT_LINK_PUBLIC_BASE_URL"
            ] as const) {
                const value = environment[name];
                if (value && new URL(value).origin !== frontendOrigin) {
                    context.addIssue({
                        code: "custom",
                        path: [name],
                        message: "deve usar o mesmo dominio de FRONTEND_URL"
                    });
                }
            }
            if (
                !corsOrigins.some((origin) => {
                    const parsed = z.url().safeParse(origin);
                    return parsed.success && new URL(parsed.data).origin === frontendOrigin;
                })
            ) {
                context.addIssue({
                    code: "custom",
                    path: ["CORS_ORIGIN"],
                    message: "deve incluir o dominio de FRONTEND_URL"
                });
            }
        }
    })
    .transform((environment) => ({
        ...environment,
        SUPERFRETE_BASE_URL: environment.SUPERFRETE_BASE_URL ?? SUPERFRETE_SANDBOX_URL,
        SUPERFRETE_EXPECTED_ENVIRONMENT: environment.SUPERFRETE_EXPECTED_ENVIRONMENT ?? "sandbox",
        CHECKOUT_ENABLED: environment.CHECKOUT_ENABLED ?? "true",
        CHECKOUT_ROLLOUT_MODE: environment.CHECKOUT_ROLLOUT_MODE ?? "PUBLIC",
        CHECKOUT_OBSERVABILITY_ENABLED: environment.CHECKOUT_OBSERVABILITY_ENABLED ?? "true",
        ABACATEPAY_EXPECTED_DEV_MODE: environment.ABACATEPAY_EXPECTED_DEV_MODE ?? "true",
        FULFILLMENT_WORKER_ENABLED: environment.FULFILLMENT_WORKER_ENABLED ?? "true",
        EMAIL_WORKER_ENABLED: environment.EMAIL_WORKER_ENABLED ?? "true",
        SHIPPING_TRACKING_WORKER_ENABLED: environment.SHIPPING_TRACKING_WORKER_ENABLED ?? "true"
    }));

export type Env = z.infer<typeof envSchema>;

export function validateEnv(environment: NodeJS.ProcessEnv = process.env): Env {
    const result = envSchema.safeParse(environment);
    if (result.success) return result.data;

    const details = result.error.issues
        .map((issue) => `- ${issue.path.join(".") || "ambiente"}: ${issue.message}`)
        .join("\n");
    throw new Error(`Variaveis de ambiente invalidas:\n${details}`);
}

export function expectedAbacatePayDevMode(environment: NodeJS.ProcessEnv = process.env) {
    const value = environment.ABACATEPAY_EXPECTED_DEV_MODE;
    if (value === "true") return true;
    if (value === "false") return false;
    if (environment.NODE_ENV !== "production") return true;
    throw new Error("ABACATEPAY_EXPECTED_DEV_MODE obrigatoria em producao");
}
