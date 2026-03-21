"use client";

import { useEffect, useState } from "react";
import { getOrders } from "@/lib/api";
import type { Order } from "@/lib/types";
import { useApiToken } from "@/hooks/use-api-token";

export function useOrders(initialOrders: Order[] = []) {
    const token = useApiToken();
    const [data, setData] = useState<Order[]>(initialOrders);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        let cancelled = false;

        async function run() {
            if (!token) {
                setError(
                    "Faça login com um perfil administrativo para consultar pedidos.",
                );
                setIsLoading(false);
                return;
            }

            try {
                setIsLoading(true);
                setError(null);
                const response = await getOrders(token);
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
    }, [token]);

    return { data, orders: data, isLoading, error };
}
