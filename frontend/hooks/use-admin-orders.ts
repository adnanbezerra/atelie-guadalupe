"use client";

import { useApiResource } from "./use-api-resource";
import { getOrders } from "@/lib/api";
import type { Order, OrderStatus } from "@/lib/types";
import { useApiToken } from "@/hooks/use-api-token";

export function useAdminOrders(initialOrders: Order[]) {
    const token = useApiToken();
    const authHeaders: Record<string, string> = token
        ? { Authorization: `Bearer ${token}` }
        : {};
    const resource = useApiResource(initialOrders, async () => {
        if (!token) {
            throw new Error("Faça login para consultar pedidos.");
        }

        const payload = await getOrders(token);
        return payload.orders;
    });

    return {
        ...resource,
        async updateOrderStatus(orderUuid: string, status: OrderStatus) {
            const response = await fetch(`/api/orders/${orderUuid}/status`, {
                method: "PATCH",
                headers: {
                    "Content-Type": "application/json",
                    ...authHeaders,
                },
                body: JSON.stringify({ status }),
            });

            const payload = await response.json();

            if (!response.ok || !payload.success) {
                throw new Error(
                    payload.error?.message ?? "Falha ao atualizar status.",
                );
            }

            await resource.refresh();
        },
    };
}
