"use client";

import { useEffect, useState } from "react";
import { AUTH_SESSION_CHANGED_EVENT } from "@/lib/auth-session";
import { AUTH_TOKEN_KEYS } from "@/lib/constants";

function readToken() {
    if (typeof window === "undefined") {
        return null;
    }

    for (const key of AUTH_TOKEN_KEYS) {
        const fromStorage = window.localStorage.getItem(key);
        if (fromStorage) {
            return fromStorage;
        }
    }

    for (const key of AUTH_TOKEN_KEYS) {
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
    const [token, setToken] = useState<string | null>(() => readToken());

    useEffect(() => {
        function syncToken() {
            setToken(readToken());
        }

        window.addEventListener(AUTH_SESSION_CHANGED_EVENT, syncToken);
        window.addEventListener("storage", syncToken);

        return () => {
            window.removeEventListener(AUTH_SESSION_CHANGED_EVENT, syncToken);
            window.removeEventListener("storage", syncToken);
        };
    }, []);

    return token;
}
