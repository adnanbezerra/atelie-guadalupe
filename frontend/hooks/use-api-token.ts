"use client";

import { useState } from "react";
import { AUTH_COOKIE_NAME } from "@/lib/constants";

const TOKEN_STORAGE_KEYS = [
    "atelie_token",
    AUTH_COOKIE_NAME,
    "auth_token",
    "auth-token",
    "token",
    "jwt",
    "access_token",
];

const TOKEN_COOKIE_KEYS = [
    AUTH_COOKIE_NAME,
    "atelie_token",
    "auth_token",
    "auth-token",
    "token",
    "jwt",
    "access_token",
];

function readToken() {
    if (typeof window === "undefined") {
        return null;
    }

    for (const key of TOKEN_STORAGE_KEYS) {
        const fromStorage = window.localStorage.getItem(key);
        if (fromStorage) {
            return fromStorage;
        }
    }

    for (const key of TOKEN_COOKIE_KEYS) {
        const cookieMatch = document.cookie.match(
            new RegExp(`(?:^|;\\s*)${key}=([^;]+)`),
        );

        if (cookieMatch) {
            return decodeURIComponent(cookieMatch[1]);
        }
    }

    return null;
}

export function useApiToken() {
    const [token] = useState<string | null>(() => readToken());

    return token;
}
