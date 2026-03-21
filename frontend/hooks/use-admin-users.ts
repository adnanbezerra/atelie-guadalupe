"use client";

import { useApiResource } from "@/hooks/use-api-resource";
import { User, UserRole } from "@/lib/types";

async function readJson<T>(input: RequestInfo, init?: RequestInit) {
    const response = await fetch(input, {
        ...init,
        cache: "no-store",
    });
    const payload = await response.json();

    if (!response.ok || !payload.success) {
        throw new Error(payload.error?.message ?? "Falha na requisicao.");
    }

    return payload.data as T;
}

export function useAdminUsers(initialUser: User | null) {
    const initialUsers = initialUser ? [initialUser] : [];
    const resource = useApiResource<User[]>(initialUsers, async () => {
        const payload = await readJson<{ user: User }>("/api/users/me");
        return payload.user ? [payload.user] : [];
    });

    return {
        ...resource,
        createUser: async (payload: {
            name: string;
            email: string;
            document: string;
            password: string;
            role: UserRole;
        }) => {
            return resource.runMutation(
                async () =>
                    readJson<{ user: User }>("/api/users", {
                        method: "POST",
                        headers: { "content-type": "application/json" },
                        body: JSON.stringify(payload),
                    }),
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
                        headers: { "content-type": "application/json" },
                        body: JSON.stringify(payload),
                    }),
                () => {
                    resource.refresh();
                },
            );
        },
    };
}
