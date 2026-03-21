export const API_BASE_URL =
    process.env.API_URL ??
    process.env.NEXT_PUBLIC_API_URL ??
    "http://localhost:3000";

export const AUTH_COOKIE_NAME = process.env.AUTH_COOKIE_NAME ?? "auth_token";

export const LOW_STOCK_THRESHOLD = 8;
