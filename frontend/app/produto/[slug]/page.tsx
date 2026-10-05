import { notFound } from "next/navigation";
import { ProductDetailClient } from "@/components/products/product-detail-client";
import { ProductLoadError } from "@/components/products/product-load-error";
import { ServerHeader } from "@/components/header/server";
import { SiteFooter } from "@/components/site/site-footer";
import { fetchProductBySlug } from "@/lib/server-api";
import { ApiError } from "@/lib/api-error";

type ProductPageProps = {
    params: Promise<{
        slug: string;
    }>;
};

export const dynamic = "force-dynamic";

export default async function ProductPage({ params }: ProductPageProps) {
    const { slug } = await params;
    let productResult;

    try {
        productResult = await fetchProductBySlug(slug);
    } catch (error) {
        if (error instanceof ApiError && error.status === 404) {
            notFound();
        }

        return (
            <>
                <ServerHeader />
                <ProductLoadError />
                <SiteFooter />
            </>
        );
    }

    if (!productResult.product) {
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
