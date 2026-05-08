"use client";

import { useEffect, useState } from "react";
import { getMyOrders, getOrders } from "@/lib/api";
import type { Order } from "@/lib/types";
import { useApiToken } from "@/hooks/use-api-token";

type UseOrdersOptions = {
    scope?: "admin" | "me";
    page?: number;
    pageSize?: number;
};

export function useOrders(
    initialOrders: Order[] = [],
    options: UseOrdersOptions = {},
) {
    const token = useApiToken();
    const [data, setData] = useState<Order[]>(initialOrders);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const scope = options.scope ?? "admin";
    const page = options.page ?? 1;
    const pageSize = options.pageSize ?? 10;

    useEffect(() => {
        let cancelled = false;

        async function run() {
            if (!token) {
                setError("Faça login para consultar pedidos.");
                setIsLoading(false);
                return;
            }

            try {
                setIsLoading(true);
                setError(null);
                const response =
                    scope === "me"
                        ? await getMyOrders(token, { page, pageSize })
                        : await getOrders(token);
                if (!cancelled) {
                    setData(response.orders);
                }
            } catch (err) {
                if (!cancelled) {
                    setError(
                        err instanceof Error
                            ? err.message
                            : "Falha ao carregar pedidos.",
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
    }, [page, pageSize, scope, token]);

    return { data, orders: data, isLoading, error };
}
