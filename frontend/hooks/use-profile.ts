"use client";

import { useState } from "react";
import { ApiError, createAdminUser, updateCurrentUser } from "@/lib/api";
import { isExpiredAccessTokenError } from "@/lib/auth-session";
import type { UpdateCurrentUserInput } from "@/lib/types";
import { useApiToken } from "@/hooks/use-api-token";
import { useUser } from "@/hooks/use-user";

export function useProfile() {
    const token = useApiToken();
    const userContext = useUser();
    const [error, setError] = useState<string | null>(null);
    const [isSubmitting, setIsSubmitting] = useState(false);

    return {
        user: userContext.user,
        isLoading: userContext.isLoading,
        error: error ?? userContext.error,
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
                if (
                    err instanceof ApiError &&
                    isExpiredAccessTokenError(err.status, {
                        error: { code: err.code, message: err.message },
                    })
                ) {
                    userContext.setUser(null);
                }

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
        updateProfile: async (input: UpdateCurrentUserInput) => {
            if (!token) {
                setError("Faça login para atualizar o perfil.");
                return null;
            }

            try {
                setIsSubmitting(true);
                setError(null);
                const response = await updateCurrentUser(token, input);
                userContext.setUser(response.user);
                return response.user;
            } catch (err) {
                if (
                    err instanceof ApiError &&
                    isExpiredAccessTokenError(err.status, {
                        error: { code: err.code, message: err.message },
                    })
                ) {
                    userContext.setUser(null);
                }

                setError(
                    err instanceof Error
                        ? err.message
                        : "Falha ao atualizar usuário.",
                );
                return null;
            } finally {
                setIsSubmitting(false);
            }
        },
    };
}
