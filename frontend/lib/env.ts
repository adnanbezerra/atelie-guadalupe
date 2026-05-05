import "server-only";

import { z } from "zod";

const envSchema = z.object({
    API_BASE_URL: z
        .string()
        .trim()
        .min(1, "API_BASE_URL is required")
        .url("API_BASE_URL must be a valid URL")
        .transform((value) => value.replace(/\/+$/, "")),
    AUTH_COOKIE_NAME: z.string().trim().min(1).default("auth_token"),
});

const parsedEnv = envSchema.safeParse(process.env);

if (!parsedEnv.success) {
    const message = parsedEnv.error.issues
        .map((issue) => `${issue.path.join(".")}: ${issue.message}`)
        .join("\n");

    throw new Error(`Invalid environment variables:\n${message}`);
}

export const env = parsedEnv.data;
