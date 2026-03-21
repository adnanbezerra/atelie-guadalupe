import { CollectionCatalog } from "@/components/collections/collection-catalog";
import { COLLECTION_CONFIG } from "@/lib/catalog";
import { fetchProductLines, fetchProducts } from "@/lib/server-api";

type BeautyCollectionPageProps = {
    searchParams?: Promise<{
        search?: string | string[];
    }>;
};

export default async function BeautyCollectionPage({
    searchParams,
}: BeautyCollectionPageProps) {
    const resolvedSearchParams = searchParams
        ? await searchParams
        : undefined;
    const search = Array.isArray(resolvedSearchParams?.search)
        ? resolvedSearchParams.search[0] ?? ""
        : resolvedSearchParams?.search ?? "";

    const [linesResult, productsResult] = await Promise.allSettled([
        fetchProductLines(),
        fetchProducts({ page: 1, pageSize: 24, search: search || undefined }),
    ]);

    const lines =
        linesResult.status === "fulfilled" ? linesResult.value.lines : [];
    const products =
        productsResult.status === "fulfilled"
            ? productsResult.value
            : undefined;

    return (
        <CollectionCatalog
            collectionKey="beauty"
            config={COLLECTION_CONFIG.beauty}
            initialCatalog={products}
            initialSearch={search}
            lines={lines}
        />
    );
}
