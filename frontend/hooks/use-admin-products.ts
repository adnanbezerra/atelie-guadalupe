"use client";

import { useApiResource } from "./use-api-resource";
import { useApiToken } from "@/hooks/use-api-token";
import type {
    CreateProductInput,
    Pagination,
    Product,
    ProductLine,
    UpdateProductInput,
} from "@/lib/types";
import {
    createProduct as createProductRequest,
    deleteProduct as deleteProductRequest,
    getProductLines,
    getProducts,
    updateProduct as updateProductRequest,
} from "@/lib/api";

export interface AdminProductsPayload {
    items: Product[];
    pagination: Pagination;
    lines: ProductLine[];
}

function cleanProductPayload<T extends CreateProductInput | UpdateProductInput>(
    payload: T,
) {
    const next = { ...payload };

    if (next.category === "SELFCARE") {
        delete next.stock;
        delete next.shippingWeightGrams;
    }

    return next;
}

export function useAdminProducts(initialData: AdminProductsPayload) {
    const token = useApiToken();
    const resource = useApiResource(initialData, async () => {
        const [productsResponse, linesResponse] = await Promise.all([
            getProducts({ page: 1, pageSize: 24 }),
            getProductLines(),
        ]);

        return {
            items: productsResponse.items,
            pagination: productsResponse.pagination,
            lines: linesResponse.lines,
        } as AdminProductsPayload;
    });

    return {
        ...resource,
        async createProduct(payload: CreateProductInput) {
            if (!token) {
                throw new Error("Faça login para criar produtos.");
            }

            await createProductRequest(token, cleanProductPayload(payload));

            await resource.refresh();
        },
        async updateProduct(productUuid: string, payload: UpdateProductInput) {
            if (!token) {
                throw new Error("Faça login para editar produtos.");
            }

            await updateProductRequest(
                token,
                productUuid,
                cleanProductPayload(payload),
            );

            await resource.refresh();
        },
        async deleteProduct(productUuid: string) {
            if (!token) {
                throw new Error("Faça login para remover produtos.");
            }

            await deleteProductRequest(token, productUuid);

            await resource.refresh();
        },
    };
}
