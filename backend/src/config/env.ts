import { z } from "zod";

const emptyToUndefined = (value: unknown) =>
    typeof value === "string" && value.trim() === "" ? undefined : value;

const optionalString = z.preprocess(emptyToUndefined, z.string().trim().min(1).optional());
const optionalUrl = z.preprocess(emptyToUndefined, z.url().optional());
const optionalEmail = z.preprocess(emptyToUndefined, z.email().optional());
const positiveInteger = (defaultValue: number) =>
    z.coerce.number().int().positive().default(defaultValue);
const enabledFlag = z.enum(["true", "false"]).default("true");

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
        SUPERFRETE_BASE_URL: optionalUrl.default("https://sandbox.superfrete.com/api/v0"),
        SUPERFRETE_TOKEN: optionalString,
        SUPERFRETE_USER_AGENT: optionalString,
        SUPERFRETE_SERVICE_CODES: z
            .string()
            .regex(/^\d+(?:,\d+)*$/, "deve conter codigos numericos separados por virgula")
            .default("1,2,17"),
        SUPERFRETE_TIMEOUT_MS: positiveInteger(15000),
        ABACATEPAY_BASE_URL: optionalUrl.default("https://api.abacatepay.com/v2"),
        ABACATEPAY_API_KEY: optionalString,
        ABACATEPAY_RETURN_URL: optionalUrl,
        ABACATEPAY_COMPLETION_URL: optionalUrl,
        ABACATEPAY_WEBHOOK_SECRET: optionalString,
        ABACATEPAY_TIMEOUT_MS: positiveInteger(15000),
        PAYMENT_LINK_PUBLIC_BASE_URL: optionalUrl,
        FULFILLMENT_WORKER_ENABLED: enabledFlag,
        FULFILLMENT_WORKER_INTERVAL_MS: positiveInteger(30000),
        FULFILLMENT_WORKER_LOCK_TIMEOUT_MS: positiveInteger(300000),
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
    });

export type Env = z.infer<typeof envSchema>;

export function validateEnv(environment: NodeJS.ProcessEnv = process.env): Env {
    const result = envSchema.safeParse(environment);
    if (result.success) return result.data;

    const details = result.error.issues
        .map((issue) => `- ${issue.path.join(".") || "ambiente"}: ${issue.message}`)
        .join("\n");
    throw new Error(`Variaveis de ambiente invalidas:\n${details}`);
}
