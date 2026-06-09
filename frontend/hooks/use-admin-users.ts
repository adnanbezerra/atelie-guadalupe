"use client";

import { useApiResource } from "@/hooks/use-api-resource";
import { useApiToken } from "@/hooks/use-api-token";
import { createAdminUser, getUsers } from "@/lib/api";
import {
    clearAuthSession,
    isExpiredAccessTokenError,
} from "@/lib/auth-session";
import { User, UserRole } from "@/lib/types";

async function readJson<T>(input: RequestInfo, init?: RequestInit) {
    const response = await fetch(input, {
        ...init,
        cache: "no-store",
    });
    const payload = await response.json();

    if (!response.ok || !payload.success) {
        if (isExpiredAccessTokenError(response.status, payload)) {
            clearAuthSession();
        }

        throw new Error(payload.error?.message ?? "Falha na requisicao.");
    }

    return payload.data as T;
}

export function useAdminUsers(initialUsers: User[]) {
    const token = useApiToken();
    const authHeaders: Record<string, string> = token
        ? { Authorization: `Bearer ${token}` }
        : {};
    const resource = useApiResource<User[]>(initialUsers, async () => {
        if (!token) {
            throw new Error("Faça login para consultar usuários.");
        }

        const payload = await getUsers(token);
        return payload.users;
    });

    return {
        ...resource,
        createUser: async (payload: {
            name: string;
            email: string;
            password: string;
            role: UserRole;
        }) => {
            return resource.runMutation(
                async () => {
                    if (!token) {
                        throw new Error("Faça login para criar usuários.");
                    }

                    return createAdminUser(token, payload);
                },
                (result) => {
                    resource.refresh();
                    return result.user;
                },
            );
        },
        updateUser: async (
            uuid: string,
            payload: Partial<Pick<User, "name" | "role" | "isActive">>,
        ) => {
            return resource.runMutation(
                async () =>
                    readJson<{ user: User }>(`/api/users/${uuid}`, {
                        method: "PATCH",
                        headers: {
                            "content-type": "application/json",
                            ...authHeaders,
                        },
                        body: JSON.stringify(payload),
                    }),
                () => {
                    resource.refresh();
                },
            );
        },
    };
}
