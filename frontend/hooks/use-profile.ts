"use client";

import { useEffect, useState } from "react";
import { createAdminUser, getCurrentUser } from "@/lib/api";
import type { User } from "@/lib/types";
import { useApiToken } from "@/hooks/use-api-token";

export function useProfile() {
    const token = useApiToken();
    const [user, setUser] = useState<User | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [isSubmitting, setIsSubmitting] = useState(false);

    useEffect(() => {
        let cancelled = false;

        async function run() {
            if (!token) {
                setError("Faça login para consultar o perfil.");
                setIsLoading(false);
                return;
            }

            try {
                setIsLoading(true);
                setError(null);
                const response = await getCurrentUser(token);
                if (!cancelled) {
                    setUser(response.user);
                }
            } catch (err) {
                if (!cancelled) {
                    setError(
                        err instanceof Error
                            ? err.message
                            : "Falha ao carregar usuário.",
                    );
                }
            } finally {
                if (!cancelled) {
                    setIsLoading(false);
                }
            }
        }

        void run();

        return () => {
            cancelled = true;
        };
    }, [token]);

    return {
        user,
        isLoading,
        error,
        isSubmitting,
        createUser: async (input: {
            name: string;
            email: string;
            document: string;
            password: string;
            role: string;
        }) => {
            if (!token) {
                setError("Faça login para criar usuários.");
                return null;
            }

            try {
                setIsSubmitting(true);
                setError(null);
                const response = await createAdminUser(token, input);
                return response.user;
            } catch (err) {
                setError(
                    err instanceof Error
                        ? err.message
                        : "Falha ao criar usuário.",
                );
                return null;
            } finally {
                setIsSubmitting(false);
            }
        },
    };
}
