"use client";

import { useApiResource } from "./use-api-resource";
import type { Pagination, Product, ProductLine } from "@/lib/types";

export interface AdminProductsPayload {
    items: Product[];
    pagination: Pagination;
    lines: ProductLine[];
}

async function parseResponse(response: Response) {
    const payload = await response.json();

    if (!response.ok || !payload.success) {
        throw new Error(payload.error?.message ?? "Falha na operação.");
    }

    return payload.data;
}

export function useAdminProducts(initialData: AdminProductsPayload) {
    const resource = useApiResource(initialData, async () => {
        const [productsResponse, linesResponse] = await Promise.all([
            fetch("/api/products?page=1&pageSize=24", {
                cache: "no-store",
            }).then((response) => response.json()),
            fetch("/api/products/lines", { cache: "no-store" }).then(
                (response) => response.json(),
            ),
        ]);

        return {
            items: productsResponse.data.items,
            pagination: productsResponse.data.pagination,
            lines: linesResponse.data.lines,
        } as AdminProductsPayload;
    });

    return {
        ...resource,
        async createProduct(payload: Record<string, unknown>) {
            await parseResponse(
                await fetch("/api/products", {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify(payload),
                }),
            );

            await resource.refresh();
        },
        async updateProduct(
            productUuid: string,
            payload: Record<string, unknown>,
        ) {
            await parseResponse(
                await fetch(`/api/products/${productUuid}`, {
                    method: "PATCH",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify(payload),
                }),
            );

            await resource.refresh();
        },
        async deleteProduct(productUuid: string) {
            await parseResponse(
                await fetch(`/api/products/${productUuid}`, {
                    method: "DELETE",
                }),
            );

            await resource.refresh();
        },
    };
}
