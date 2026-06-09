import { notFound } from "next/navigation";
import { ProductDetailClient } from "@/components/products/product-detail-client";
import { ServerHeader } from "@/components/header/server";
import { SiteFooter } from "@/components/site/site-footer";
import { fetchProductBySlug } from "@/lib/server-api";

type ProductPageProps = {
    params: Promise<{
        slug: string;
    }>;
};

export const dynamic = "force-dynamic";

export default async function ProductPage({ params }: ProductPageProps) {
    const { slug } = await params;
    const productResult = await fetchProductBySlug(slug).catch(() => null);

    if (!productResult?.product) {
        notFound();
    }

    const activeCollection =
        productResult.product.category === "ARTISANAL" ? "crafts" : "beauty";

    return (
        <>
            <ServerHeader
                activeCollection={activeCollection}
                searchPath={
                    activeCollection === "crafts"
                        ? "/artesanato"
                        : "/beleza-natural"
                }
            />
            <ProductDetailClient product={productResult.product} />
            <SiteFooter />
        </>
    );
}
