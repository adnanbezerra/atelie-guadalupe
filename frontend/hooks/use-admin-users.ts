"use client";

import { useApiResource } from "@/hooks/use-api-resource";
import { useApiToken } from "@/hooks/use-api-token";
import { createAdminUser, getUsers, updateAdminUser } from "@/lib/api";
import { ApiError } from "@/lib/api-error";
import { User, UserRole, UsersPayload } from "@/lib/types";
import { useEffect, useRef } from "react";

export function useAdminUsers(
    initialData: UsersPayload,
    query: {
        page: number;
        pageSize: number;
        search?: string;
        role?: string;
        isActive?: boolean;
    },
) {
    const token = useApiToken();
    const resource = useApiResource<UsersPayload>(initialData, async () => {
        if (!token) {
            throw new Error("Faça login para consultar usuários.");
        }

        try {
            return await getUsers(token, query);
        } catch (error) {
            if (error instanceof ApiError && error.status === 403) {
                throw new Error(
                    "Seu acesso não permite consultar ou gerenciar usuários.",
                );
            }

            throw error;
        }
    });
    const queryKey = JSON.stringify([query, token]);
    const didMount = useRef(false);
    const refresh = resource.refresh;

    useEffect(() => {
        if (!didMount.current) {
            didMount.current = true;
            return;
        }

        void refresh();
    }, [queryKey, refresh]);

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
