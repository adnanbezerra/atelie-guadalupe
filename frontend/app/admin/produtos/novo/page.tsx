import { AdminProductEditorClient } from "@/components/admin/admin-product-editor-client";
import type { AdminProductsPayload } from "@/hooks/use-admin-products";
import { fetchProductLines, fetchProducts } from "@/lib/server-api";

export default async function AdminNewProductPage() {
    const [linesResult, productsResult] = await Promise.allSettled([
        fetchProductLines(),
        fetchProducts({ page: 1, pageSize: 40 }),
    ]);

    const products =
        productsResult.status === "fulfilled"
            ? productsResult.value
            : {
                  items: [],
                  pagination: {
                      page: 1,
                      pageSize: 40,
                      total: 0,
                      totalPages: 0,
                  },
              };
    const lines =
        linesResult.status === "fulfilled" ? linesResult.value.lines : [];

    const initialData: AdminProductsPayload = {
        ...products,
        lines,
    };

    return <AdminProductEditorClient initialData={initialData} />;
}
