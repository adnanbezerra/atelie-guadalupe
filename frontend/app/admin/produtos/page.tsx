import { AdminProductsClient } from "@/components/admin/admin-products-client";
import { fetchProductLines, fetchProducts } from "@/lib/server-api";

export default async function AdminProductsPage() {
    const [linesResult, productsResult] = await Promise.allSettled([
        fetchProductLines(),
        fetchProducts({ page: 1, pageSize: 40 }),
    ]);

    const lines =
        linesResult.status === "fulfilled" ? linesResult.value.lines : [];
    const initialCatalog =
        productsResult.status === "fulfilled"
            ? productsResult.value
            : undefined;

    return (
        <AdminProductsClient
            initialCatalog={initialCatalog}
            initialLines={lines}
        />
    );
}
