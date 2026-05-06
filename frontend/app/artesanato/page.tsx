import { CollectionCatalog } from "@/components/collections/collection-catalog";
import { SiteFooter } from "@/components/site/site-footer";
import { COLLECTION_CONFIG } from "@/lib/catalog";
import { fetchProductLines, fetchProducts } from "@/lib/server-api";

type CraftsCollectionPageProps = {
    searchParams?: Promise<{
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

    const [linesResult, productsResult] = await Promise.allSettled([
        fetchProductLines({ category: "ARTESANATO" }),
        fetchProducts({
            page: 1,
            pageSize: 24,
            category: "ARTESANATO",
            search: search || undefined,
        }),
    ]);

    const lines =
        linesResult.status === "fulfilled" ? linesResult.value.lines : [];
    const products =
        productsResult.status === "fulfilled"
            ? productsResult.value
            : undefined;

    return (
        <>
            <CollectionCatalog
                collectionKey="crafts"
                config={COLLECTION_CONFIG.crafts}
                initialCatalog={products}
                initialSearch={search}
                lines={lines}
            />
            <SiteFooter />
        </>
    );
}
