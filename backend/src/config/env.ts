import { isIP } from "node:net";
import { z } from "zod";

const emptyToUndefined = (value: unknown) =>
    typeof value === "string" && value.trim() === "" ? undefined : value;

const optionalString = z.preprocess(emptyToUndefined, z.string().trim().min(1).optional());
const optionalUrl = z.preprocess(emptyToUndefined, z.url().optional());
const optionalEmail = z.preprocess(emptyToUndefined, z.email().optional());
const positiveInteger = (defaultValue: number) =>
    z.coerce.number().int().positive().default(defaultValue);
const enabledFlag = z.enum(["true", "false"]).default("true");
const checkoutEnabledFlag = z.enum(["true", "false"]).optional();

const SUPERFRETE_PRODUCTION_URL = "https://api.superfrete.com/api/v0";
const ABACATEPAY_V2_URL = "https://api.abacatepay.com/v2";

function isPrivateHostname(hostname: string) {
    const normalized = hostname.toLowerCase().replace(/^\[|\]$/g, "").replace(/\.$/, "");
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

const envSchema = z
    .object({
        NODE_ENV: z.enum(["development", "test", "production"]).default("development"),
        PORT: z.coerce.number().int().min(1).max(65535).default(3000),
        DATABASE_URL: optionalString.refine(
            (value) => !value || /^postgres(?:ql)?:\/\//.test(value),
            "deve ser uma URL PostgreSQL"
        ),
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
        ABACATEPAY_BASE_URL: optionalUrl.default(ABACATEPAY_V2_URL),
        ABACATEPAY_API_KEY: optionalString,
        ABACATEPAY_RETURN_URL: optionalUrl,
        ABACATEPAY_COMPLETION_URL: optionalUrl,
        ABACATEPAY_WEBHOOK_SECRET: optionalString,
        ABACATEPAY_TIMEOUT_MS: positiveInteger(15000),
        PAYMENT_LINK_PUBLIC_BASE_URL: optionalUrl,
        CHECKOUT_ENABLED: checkoutEnabledFlag,
        FULFILLMENT_WORKER_ENABLED: enabledFlag,
        FULFILLMENT_WORKER_INTERVAL_MS: positiveInteger(30000),
        FULFILLMENT_WORKER_LOCK_TIMEOUT_MS: positiveInteger(300000),
        FULFILLMENT_WORKER_MAX_ATTEMPTS: positiveInteger(8),
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
        } else if (environment.SUPERFRETE_BASE_URL !== SUPERFRETE_PRODUCTION_URL) {
            context.addIssue({
                code: "custom",
                path: ["SUPERFRETE_BASE_URL"],
                message: `deve ser ${SUPERFRETE_PRODUCTION_URL} em producao`
            });
        }

        if (environment.ABACATEPAY_BASE_URL !== ABACATEPAY_V2_URL) {
            context.addIssue({
                code: "custom",
                path: ["ABACATEPAY_BASE_URL"],
                message: `deve ser ${ABACATEPAY_V2_URL} em producao`
            });
        }
        if (environment.ABACATEPAY_API_KEY?.toLowerCase().startsWith("abc_dev_")) {
            context.addIssue({
                code: "custom",
                path: ["ABACATEPAY_API_KEY"],
                message: "chave de desenvolvimento nao permitida em producao"
            });
        }

        if (!environment.CHECKOUT_ENABLED) {
            context.addIssue({
                code: "custom",
                path: ["CHECKOUT_ENABLED"],
                message: "obrigatoria em producao"
            });
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
        SUPERFRETE_BASE_URL:
            environment.SUPERFRETE_BASE_URL ?? "https://sandbox.superfrete.com/api/v0",
        CHECKOUT_ENABLED: environment.CHECKOUT_ENABLED ?? "true"
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
