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

    return (
        status === 401 &&
        payload.error?.code === "UNAUTHORIZED" &&
        message.includes("access token") &&
        message.includes("expirado")
    );
}

export function clearAuthSession() {
    if (typeof window === "undefined") {
        return;
    }

    for (const key of AUTH_TOKEN_KEYS) {
        document.cookie = `${key}=; path=/; max-age=0; samesite=lax`;
        window.localStorage.removeItem(key);
    }

    window.dispatchEvent(new Event(AUTH_SESSION_CHANGED_EVENT));
}

export function notifyAuthSessionChanged() {
    if (typeof window === "undefined") {
        return;
    }

    window.dispatchEvent(new Event(AUTH_SESSION_CHANGED_EVENT));
}
