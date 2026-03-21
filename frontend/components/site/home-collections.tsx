"use client";

import Link from "next/link";
import { useMemo } from "react";
import { ProductShelfSkeleton } from "@/components/site/product-shelf-skeleton";
import { Card } from "@/components/ui/card";
import { useProducts } from "@/hooks/use-products";
import { filterProductsByCollection, getCollectionCopy } from "@/lib/catalog";
import { CollectionKey, Product, ProductsPayload } from "@/lib/types";
import { getPriceLabel } from "@/lib/utils";

type HomeCollectionsProps = {
    initialCollections: Record<CollectionKey, Product[]>;
};

function Shelf({
    title,
    href,
    products,
}: {
    title: string;
    href: string;
    products: Product[];
}) {
    return (
        <section className="px-4 pb-16 sm:px-6 lg:px-8">
            <div className="mx-auto max-w-7xl">
                <div className="mb-6 flex items-end justify-between gap-4">
                    <div>
                        <h3 className="font-display text-3xl font-bold text-slate-900">
                            {title}
                        </h3>
                        <p className="mt-2 text-sm text-slate-600">
                            Produtos renderizados com dados reais e curadoria
                            visual inspirada no Stitch.
                        </p>
                    </div>
                    <Link
                        href={href}
                        className="text-sm font-semibold text-primary"
                    >
                        Ver colecao completa
                    </Link>
                </div>
                <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-4">
                    {products.map((product) => (
                        <Card
                            key={product.uuid}
                            className="overflow-hidden p-4"
                        >
                            <div className="aspect-[4/4.6] overflow-hidden rounded-[1.5rem] bg-slate-100">
                                {product.imageUrl ? (
                                    <img
                                        alt={product.name}
                                        className="h-full w-full object-cover"
                                        src={product.imageUrl}
                                    />
                                ) : null}
                            </div>
                            <div className="mt-4">
                                <p className="text-xs font-semibold uppercase tracking-[0.25em] text-primary/70">
                                    {product.line.name}
                                </p>
                                <h4 className="mt-2 font-display text-xl font-bold text-slate-900">
                                    {product.name}
                                </h4>
                                <p className="mt-2 line-clamp-2 text-sm leading-6 text-slate-600">
                                    {product.shortDescription}
                                </p>
                                <div className="mt-4 flex items-center justify-between">
                                    <span className="text-sm font-semibold text-slate-900">
                                        {getPriceLabel(product.priceOptions)}
                                    </span>
                                    <Link
                                        href="/carrinho"
                                        className="text-sm font-semibold text-primary"
                                    >
                                        Ver no carrinho
                                    </Link>
                                </div>
                            </div>
                        </Card>
                    ))}
                </div>
            </div>
        </section>
    );
}

export function HomeCollections({ initialCollections }: HomeCollectionsProps) {
    const { data, isLoading } = useProducts(
        {
            items: [...initialCollections.beauty, ...initialCollections.crafts],
            pagination: {
                page: 1,
                pageSize: 8,
                total: 8,
                totalPages: 1,
            },
        } satisfies ProductsPayload,
        { page: 1, pageSize: 18 },
    );

    const collections = useMemo(() => {
        const items = data?.items ?? [];

        return {
            beauty: filterProductsByCollection(items, "beauty").slice(0, 4),
            crafts: filterProductsByCollection(items, "crafts").slice(0, 4),
        };
    }, [data]);

    if (isLoading && !data?.items.length) {
        return <ProductShelfSkeleton />;
    }

    return (
        <>
            <Shelf
                href="/beleza-natural"
                products={collections.beauty}
                title={getCollectionCopy("beauty").title}
            />
            <Shelf
                href="/artesanato"
                products={collections.crafts}
                title={getCollectionCopy("crafts").title}
            />
        </>
    );
}
