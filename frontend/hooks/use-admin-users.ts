"use client";

import { useApiResource } from "@/hooks/use-api-resource";
import { useApiToken } from "@/hooks/use-api-token";
import { createAdminUser, getUsers, updateAdminUser } from "@/lib/api";
import { ApiError } from "@/lib/api-error";
import { User, UserRole } from "@/lib/types";

export function useAdminUsers(initialUsers: User[]) {
    const token = useApiToken();
    const resource = useApiResource<User[]>(initialUsers, async () => {
        if (!token) {
            throw new Error("Faça login para consultar usuários.");
        }

        try {
            const payload = await getUsers(token);
            return payload.users;
        } catch (error) {
            if (error instanceof ApiError && error.status === 403) {
                throw new Error(
                    "Seu acesso não permite consultar ou gerenciar usuários.",
                );
            }

            throw error;
        }
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
                async () => {
                    if (!token) {
                        throw new Error("Faça login para alterar usuários.");
                    }

                    return updateAdminUser(token, uuid, payload);
                },
                () => {
                    resource.refresh();
                },
            );
        },
    };
}
