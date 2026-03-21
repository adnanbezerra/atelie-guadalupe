"use client";

import { useApiResource } from "./use-api-resource";
import type { Order, OrderStatus } from "@/lib/types";

export function useAdminOrders(initialOrders: Order[]) {
    const resource = useApiResource(initialOrders, async () => {
        const response = await fetch("/api/orders", { cache: "no-store" });
        const payload = await response.json();
        return payload.data.orders as Order[];
    });

    return {
        ...resource,
        async updateOrderStatus(orderUuid: string, status: OrderStatus) {
            const response = await fetch(`/api/orders/${orderUuid}/status`, {
                method: "PATCH",
                headers: { "Content-Type": "application/json" },
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
