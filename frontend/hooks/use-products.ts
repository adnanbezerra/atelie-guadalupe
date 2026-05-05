"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { getProductLines, getProducts } from "@/lib/api";
import type {
    ProductLine,
    ProductListResponse,
    ProductsPayload,
    ProductQuery,
} from "@/lib/types";

type HydrationOptions = {
    skipClientFetch?: boolean;
};

export function useProductCatalog(query: ProductQuery) {
    const [data, setData] = useState<ProductListResponse | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const queryKey = JSON.stringify(query);
    const queryRef = useRef(query);
    queryRef.current = query;

    const refresh = useCallback(async () => {
        try {
            setIsLoading(true);
            setError(null);
            const response = await getProducts(queryRef.current);
            setData(response);
        } catch (err) {
            setError(
                err instanceof Error
                    ? err.message
                    : "Falha ao carregar produtos.",
            );
        } finally {
            setIsLoading(false);
        }
    }, []);

    useEffect(() => {
        let cancelled = false;

        async function run() {
            try {
                setIsLoading(true);
                setError(null);
                const response = await getProducts(queryRef.current);
                if (!cancelled) {
                    setData(response);
                }
            } catch (err) {
                if (!cancelled) {
                    setError(
                        err instanceof Error
                            ? err.message
                            : "Falha ao carregar produtos.",
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
    }, [queryKey]);

    return { data, isLoading, error, refresh };
}

export function useProducts(
    initialData: ProductsPayload | null | undefined,
    query: ProductQuery,
    options?: HydrationOptions,
): {
    data: ProductsPayload | null;
    isLoading: boolean;
    error: string | null;
    refresh: () => Promise<void>;
    isPending: boolean;
};
export function useProducts(
    query: ProductQuery,
    initialData?: ProductsPayload | null,
    options?: HydrationOptions,
): {
    data: ProductsPayload | null;
    isLoading: boolean;
    error: string | null;
    refresh: () => Promise<void>;
    isPending: boolean;
};
export function useProducts(
    first: ProductsPayload | ProductQuery | null | undefined,
    second?: ProductQuery | ProductsPayload | null,
    options: HydrationOptions = {},
) {
    const initialData =
        first && "items" in first
            ? first
            : second && "items" in second
              ? second
              : null;
    const query =
        first && "items" in first
            ? (second as ProductQuery)
            : (first as ProductQuery);
    const [data, setData] = useState<ProductsPayload | null>(
        initialData ?? null,
    );
    const [isLoading, setIsLoading] = useState(!initialData);
    const [error, setError] = useState<string | null>(null);
    const queryKey = JSON.stringify(query);
    const queryRef = useRef(query);
    const skipClientFetch = Boolean(options.skipClientFetch && initialData);
    queryRef.current = query;

    useEffect(() => {
        if (initialData) {
            setData(initialData);
            setIsLoading(false);
        }
    }, [initialData]);

    const refresh = useCallback(async () => {
        try {
            setIsLoading(true);
            setError(null);
            const response = await getProducts(queryRef.current);
            setData(response);
        } catch (err) {
            setError(
                err instanceof Error
                    ? err.message
                    : "Falha ao carregar produtos.",
            );
        } finally {
            setIsLoading(false);
        }
    }, []);

    useEffect(() => {
        if (skipClientFetch) {
            return;
        }

        let cancelled = false;

        async function run() {
            try {
                setIsLoading(true);
                setError(null);
                const response = await getProducts(queryRef.current);
                if (!cancelled) {
                    setData(response);
                }
            } catch (err) {
                if (!cancelled) {
                    setError(
                        err instanceof Error
                            ? err.message
                            : "Falha ao carregar produtos.",
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
    }, [skipClientFetch, queryKey]);

    return { data, isLoading, error, refresh, isPending: isLoading };
}

export function useProductLines(
    initialLines: ProductLine[] = [],
    options: HydrationOptions = {},
) {
    const [data, setData] = useState<ProductLine[]>(initialLines);
    const [isLoading, setIsLoading] = useState(initialLines.length === 0);
    const [error, setError] = useState<string | null>(null);
    const skipClientFetch = Boolean(options.skipClientFetch);

    useEffect(() => {
        if (skipClientFetch) {
            return;
        }

        let cancelled = false;

        async function run() {
            try {
                setIsLoading(true);
                setError(null);
                const response = await getProductLines();
                if (!cancelled) {
                    setData(response.lines);
                }
            } catch (err) {
                if (!cancelled) {
                    setError(
                        err instanceof Error
                            ? err.message
                            : "Falha ao carregar linhas.",
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
    }, [skipClientFetch]);

    return { data, lines: data, isLoading, error };
}
