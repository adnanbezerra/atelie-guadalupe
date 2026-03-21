import { CollectionCatalog } from "@/components/collections/collection-catalog";
import { COLLECTION_CONFIG } from "@/lib/catalog";
import { fetchProductLines, fetchProducts } from "@/lib/server-api";

export default async function CraftsCollectionPage() {
    const [linesResult, productsResult] = await Promise.allSettled([
        fetchProductLines(),
        fetchProducts({ page: 1, pageSize: 24 }),
    ]);

    const lines =
        linesResult.status === "fulfilled" ? linesResult.value.lines : [];
    const products =
        productsResult.status === "fulfilled"
            ? productsResult.value
            : undefined;

    return (
        <CollectionCatalog
            collectionKey="crafts"
            config={COLLECTION_CONFIG.crafts}
            initialCatalog={products}
            lines={lines}
        />
    );
}
