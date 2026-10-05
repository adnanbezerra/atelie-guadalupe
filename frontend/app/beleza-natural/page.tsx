import { CollectionCatalog } from "@/components/collections/collection-catalog";
import { SiteFooter } from "@/components/site/site-footer";
import { COLLECTION_CONFIG } from "@/lib/catalog";
import { fetchProductLines, fetchProducts } from "@/lib/server-api";

export const dynamic = "force-dynamic";

type BeautyCollectionPageProps = {
    searchParams?: Promise<{
        search?: string | string[];
        lineUuid?: string | string[];
        page?: string | string[];
    }>;
};

export default async function BeautyCollectionPage({
    searchParams,
}: BeautyCollectionPageProps) {
    const resolvedSearchParams = searchParams ? await searchParams : undefined;
    const search = Array.isArray(resolvedSearchParams?.search)
        ? (resolvedSearchParams.search[0] ?? "")
        : (resolvedSearchParams?.search ?? "");
    const lineUuid = Array.isArray(resolvedSearchParams?.lineUuid)
        ? (resolvedSearchParams.lineUuid[0] ?? "")
        : (resolvedSearchParams?.lineUuid ?? "");
    const rawPage = Array.isArray(resolvedSearchParams?.page)
        ? resolvedSearchParams.page[0]
        : resolvedSearchParams?.page;
    const page = Math.max(1, Number(rawPage) || 1);

    const [linesResult, productsResult] = await Promise.allSettled([
        fetchProductLines({ category: "BELEZA" }),
        fetchProducts({
            page,
            pageSize: 24,
            category: "BELEZA",
            search: search || undefined,
            lineUuid: lineUuid || undefined,
        }),
    ]);

    const lines =
        linesResult.status === "fulfilled" ? linesResult.value.lines : [];
    const products =
        productsResult.status === "fulfilled"
            ? productsResult.value
            : undefined;
    const linesError =
        linesResult.status === "rejected"
            ? linesResult.reason instanceof Error
                ? linesResult.reason.message
                : "A consulta às linhas de produtos falhou."
            : null;
    const productsError =
        productsResult.status === "rejected"
            ? productsResult.reason instanceof Error
                ? productsResult.reason.message
                : "A consulta aos produtos falhou."
            : null;

    return (
        <>
            <CollectionCatalog
                collectionKey="beauty"
                config={COLLECTION_CONFIG.beauty}
                initialCatalog={products}
                initialLineUuid={lineUuid}
                initialPage={page}
                initialSearch={search}
                initialLinesError={linesError}
                initialProductsError={productsError}
                lines={lines}
            />
            <SiteFooter />
        </>
    );
}
