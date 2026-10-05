import { CollectionCatalog } from "@/components/collections/collection-catalog";
import { SiteFooter } from "@/components/site/site-footer";
import { COLLECTION_CONFIG } from "@/lib/catalog";
import { fetchProductLines, fetchProducts } from "@/lib/server-api";

type CraftsCollectionPageProps = {
    searchParams?: Promise<{
        lineUuid?: string | string[];
        page?: string | string[];
        search?: string | string[];
    }>;
};

export default async function CraftsCollectionPage({
    searchParams,
}: CraftsCollectionPageProps) {
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
        fetchProductLines({ category: "ARTESANATO" }),
        fetchProducts({
            page,
            pageSize: 24,
            category: "ARTESANATO",
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
                collectionKey="crafts"
                config={COLLECTION_CONFIG.crafts}
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
