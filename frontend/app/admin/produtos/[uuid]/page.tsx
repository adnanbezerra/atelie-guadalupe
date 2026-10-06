import { AdminProductEditorClient } from "@/components/admin/admin-product-editor-client";
import { ApiError } from "@/lib/api-error";
import { fetchProductByUuid, fetchProductLines } from "@/lib/server-api";

export default async function AdminEditProductPage({
    params,
}: {
    params: Promise<{ uuid: string }>;
}) {
    const { uuid } = await params;
    const [linesResult, productResult] = await Promise.allSettled([
        fetchProductLines(),
        fetchProductByUuid(uuid),
    ]);
    const lines =
        linesResult.status === "fulfilled" ? linesResult.value.lines : [];
    const product =
        productResult.status === "fulfilled"
            ? productResult.value.product
            : null;
    const productError =
        productResult.status === "rejected" ? productResult.reason : null;
    const notFound =
        productError instanceof ApiError && productError.status === 404;
    const loadError = notFound
        ? "Este produto não existe ou não está mais disponível."
        : productError || linesResult.status === "rejected"
          ? "Não foi possível carregar os dados do produto."
          : null;

    return (
        <AdminProductEditorClient
            initialLines={lines}
            initialProduct={product}
            loadError={loadError}
            notFound={notFound}
            productUuid={uuid}
        />
    );
}
