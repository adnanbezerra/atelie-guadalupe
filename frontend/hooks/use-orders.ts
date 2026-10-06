"use client";

import { useEffect, useState } from "react";
import { getMyOrders, getOrders } from "@/lib/api";
import type { Order, Pagination } from "@/lib/types";
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
    const scope = options.scope ?? "admin";
    const page = options.page ?? 1;
    const pageSize = options.pageSize ?? 10;
    const [data, setData] = useState<Order[]>(initialOrders);
    const [pagination, setPagination] = useState<Pagination>({
        page,
        pageSize,
        total: initialOrders.length,
        totalPages: initialOrders.length ? 1 : 0,
    });
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

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
                    setPagination(
                        response.pagination ?? {
                            page: 1,
                            pageSize: response.orders.length,
                            total: response.orders.length,
                            totalPages: response.orders.length ? 1 : 0,
                        },
                    );
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

    return { data, orders: data, pagination, isLoading, error };
}
