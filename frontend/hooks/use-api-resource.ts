"use client";

import { useCallback, useEffect, useState, useTransition } from "react";

type ResourceState<T> = {
    data: T;
    error: string | null;
    isLoading: boolean;
    isPending: boolean;
    refresh: () => Promise<void>;
    runMutation: <TResult>(
        action: () => Promise<TResult>,
        onSuccess?: (result: TResult) => void,
    ) => Promise<TResult>;
};

export function useApiResource<T>(
    initialData: T,
    loader: () => Promise<T>,
): ResourceState<T> {
    const [data, setData] = useState(initialData);
    const [error, setError] = useState<string | null>(null);
    const [isLoading, setIsLoading] = useState(initialData == null);
    const [isPending, startTransition] = useTransition();

    const refresh = useCallback(async () => {
        setIsLoading(true);
        setError(null);

        try {
            const next = await loader();
            setData(next);
        } catch (reason) {
            setError(
                reason instanceof Error ? reason.message : "Erro inesperado.",
            );
        } finally {
            setIsLoading(false);
        }
    }, [loader]);

    async function runMutation<TResult>(
        action: () => Promise<TResult>,
        onSuccess?: (result: TResult) => void,
    ) {
        const result = await action();

        startTransition(() => {
            onSuccess?.(result);
        });

        return result;
    }

    useEffect(() => {
        if (initialData == null) {
            void refresh();
        }
    }, [initialData, refresh]);

    return {
        data,
        error,
        isLoading,
        isPending,
        refresh,
        runMutation,
    };
}
