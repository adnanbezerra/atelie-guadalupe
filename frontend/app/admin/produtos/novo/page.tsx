import { AdminProductEditorClient } from "@/components/admin/admin-product-editor-client";
import { fetchProductLines } from "@/lib/server-api";

export default async function AdminNewProductPage() {
    const [lines] = await Promise.allSettled([fetchProductLines()]);

    return (
        <AdminProductEditorClient
            initialLines={lines.status === "fulfilled" ? lines.value.lines : []}
            loadError={
                lines.status === "rejected"
                    ? "Não foi possível carregar as linhas de produto."
                    : null
            }
        />
    );
}
