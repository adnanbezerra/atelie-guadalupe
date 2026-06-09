import { AUTH_TOKEN_KEYS } from "@/lib/constants";

export const AUTH_SESSION_CHANGED_EVENT = "atelie:auth-session-changed";

type ApiErrorPayload = {
    error?: {
        code?: string;
        message?: string;
    };
};

export function isExpiredAccessTokenError(
    status: number,
    payload: ApiErrorPayload,
) {
    const message = payload.error?.message?.toLowerCase() ?? "";
    const code = payload.error?.code;
    const mentionsAccessToken =
        message.includes("access token") || message.includes("jwt");
    const hasExpiredTokenMessage =
        mentionsAccessToken &&
        (message.includes("expirado") || message.includes("expired"));
    const hasInvalidTokenMessage =
        mentionsAccessToken &&
        (message.includes("invalid") ||
            message.includes("invalido") ||
            message.includes("inválido"));

    return (
        (code === "UNAUTHORIZED" && status === 401) ||
        hasExpiredTokenMessage ||
        hasInvalidTokenMessage
    );
}

export function isAuthSessionFailureEndpoint(path: string) {
    const normalizedPath = path.startsWith("/api/")
        ? path.slice("/api".length)
        : path;

    return (
        normalizedPath === "/users/me" ||
        normalizedPath.startsWith("/users/me/") ||
        normalizedPath === "/cart/items" ||
        normalizedPath.startsWith("/cart/items/")
    );
}

export function clearAuthSession(options: { redirectToLogin?: boolean } = {}) {
    if (typeof window === "undefined") {
        return;
    }

    for (const key of AUTH_TOKEN_KEYS) {
        document.cookie = `${key}=; path=/; max-age=0; samesite=lax`;
        window.localStorage.removeItem(key);
    }

    window.dispatchEvent(new Event(AUTH_SESSION_CHANGED_EVENT));

    if (options.redirectToLogin) {
        const currentPath = `${window.location.pathname}${window.location.search}`;
        const loginUrl = new URL("/login", window.location.origin);

        if (!["/login", "/cadastro"].includes(window.location.pathname)) {
            loginUrl.searchParams.set("next", currentPath);
            window.location.assign(loginUrl.toString());
        }
    }
}

export function notifyAuthSessionChanged() {
    if (typeof window === "undefined") {
        return;
    }

    window.dispatchEvent(new Event(AUTH_SESSION_CHANGED_EVENT));
}
