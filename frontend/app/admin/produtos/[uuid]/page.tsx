import { AdminProductEditorClient } from "@/components/admin/admin-product-editor-client";
import type { AdminProductsPayload } from "@/hooks/use-admin-products";
import { fetchProductLines, fetchProducts } from "@/lib/server-api";

export default async function AdminEditProductPage({
    params,
}: {
    params: Promise<{ uuid: string }>;
}) {
    const { uuid } = await params;
    const [linesResult, productsResult] = await Promise.allSettled([
        fetchProductLines(),
        fetchProducts({ page: 1, pageSize: 100 }),
    ]);

    const products =
        productsResult.status === "fulfilled"
            ? productsResult.value
            : {
                  items: [],
                  pagination: {
                      page: 1,
                      pageSize: 100,
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

    return (
        <AdminProductEditorClient
            initialData={initialData}
            productUuid={uuid}
        />
    );
}
