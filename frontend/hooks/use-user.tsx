"use client";

import {
    createContext,
    createElement,
    useCallback,
    useContext,
    useEffect,
    useMemo,
    useRef,
    useState,
} from "react";
import { useApiToken } from "@/hooks/use-api-token";
import { getCurrentUser } from "@/lib/api";
import type { Address, User } from "@/lib/types";

type UserContextValue = {
    user: User | null;
    address: Address | null;
    isAuthenticated: boolean;
    isLoading: boolean;
    error: string | null;
    refresh: () => Promise<void>;
    setUser: (user: User | null) => void;
};

const UserContext = createContext<UserContextValue | null>(null);

export function UserProvider({ children }: { children: React.ReactNode }) {
    const token = useApiToken();
    const [user, setUser] = useState<User | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const requestIdRef = useRef(0);

    const refresh = useCallback(async () => {
        const requestId = ++requestIdRef.current;

        if (!token) {
            setUser(null);
            setError(null);
            setIsLoading(false);
            return;
        }

        try {
            setIsLoading(true);
            setError(null);
            const response = await getCurrentUser(token);
            if (requestIdRef.current === requestId) {
                setUser(response.user);
            }
        } catch (caughtError) {
            if (requestIdRef.current === requestId) {
                setUser(null);
                setError(
                    caughtError instanceof Error
                        ? caughtError.message
                        : "Falha ao carregar usuário.",
                );
            }
        } finally {
            if (requestIdRef.current === requestId) {
                setIsLoading(false);
            }
        }
    }, [token]);

    useEffect(() => {
        void refresh();

        return () => {
            requestIdRef.current += 1;
        };
    }, [refresh]);

    const value = useMemo<UserContextValue>(
        () => ({
            user,
            address: user?.address ?? user?.addresses?.[0] ?? null,
            isAuthenticated: Boolean(token),
            isLoading,
            error,
            refresh,
            setUser,
        }),
        [error, isLoading, refresh, token, user],
    );

    return createElement(UserContext.Provider, { value }, children);
}

export function useUser() {
    const context = useContext(UserContext);

    if (!context) {
        throw new Error("useUser deve ser usado dentro de UserProvider.");
    }

    return context;
}
