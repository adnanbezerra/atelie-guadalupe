"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { ProductGridSkeleton } from "@/components/collections/product-grid-skeleton";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { useProductLines, useProducts } from "@/hooks/use-products";
import { filterProductsByCollection } from "@/lib/catalog";
import { CollectionKey, ProductLine, ProductsPayload } from "@/lib/types";
import { formatCurrency, getPriceLabel } from "@/lib/utils";

type CollectionCatalogProps = {
    collectionKey: CollectionKey;
    config: {
        title: string;
        description: string;
        heroAccent: string;
    };
    initialCatalog?: ProductsPayload;
    lines: ProductLine[];
};

export function CollectionCatalog({
    collectionKey,
    config,
    initialCatalog,
    lines: initialLines,
}: CollectionCatalogProps) {
    const [search, setSearch] = useState("");
    const [lineUuid, setLineUuid] = useState("");
    const [inStockOnly, setInStockOnly] = useState(false);

    const linesResource = useProductLines(initialLines);
    const productsResource = useProducts(initialCatalog, {
        page: 1,
        pageSize: 24,
        search,
        lineUuid: lineUuid || undefined,
        inStock: inStockOnly || undefined,
    });

    const filteredProducts = useMemo(() => {
        const items = productsResource.data?.items ?? [];
        return filterProductsByCollection(items, collectionKey);
    }, [collectionKey, productsResource.data?.items]);

    return (
        <main className="px-4 py-8 sm:px-6 lg:px-8">
            <div className="mx-auto max-w-7xl">
                <section className="relative overflow-hidden rounded-[2rem] border border-white/60 bg-[linear-gradient(140deg,rgba(255,255,255,0.88),rgba(239,231,218,0.92))] p-8 shadow-xl">
                    <div className="absolute inset-y-0 right-0 hidden w-2/5 bg-[radial-gradient(circle_at_center,rgba(25,64,179,0.12),transparent_60%)] lg:block" />
                    <Badge className="bg-primary/10 text-primary">
                        {config.heroAccent}
                    </Badge>
                    <h1 className="mt-4 max-w-2xl font-display text-4xl font-bold text-slate-900 md:text-5xl">
                        {config.title}
                    </h1>
                    <p className="mt-4 max-w-2xl text-sm leading-7 text-slate-600 md:text-base">
                        {config.description}
                    </p>
                    <div className="mt-8 grid gap-4 lg:grid-cols-[1.2fr_0.8fr]">
                        <div className="grid gap-4 sm:grid-cols-3">
                            <Input
                                value={search}
                                onChange={(event) =>
                                    setSearch(event.target.value)
                                }
                                placeholder="Buscar por nome ou descricao"
                                className="sm:col-span-2"
                            />
                            <select
                                className="h-11 rounded-2xl border border-slate-200 bg-white px-4 text-sm shadow-sm outline-none focus:border-primary/50 focus:ring-4 focus:ring-primary/10"
                                onChange={(event) =>
                                    setLineUuid(event.target.value)
                                }
                                value={lineUuid}
                            >
                                <option value="">Todas as linhas</option>
                                {linesResource.data.map((line) => (
                                    <option key={line.uuid} value={line.uuid}>
                                        {line.name}
                                    </option>
                                ))}
                            </select>
                        </div>
                        <label className="flex items-center gap-3 rounded-2xl border border-white/70 bg-white/80 px-4 py-3 text-sm font-medium text-slate-700 shadow-sm">
                            <input
                                checked={inStockOnly}
                                onChange={(event) =>
                                    setInStockOnly(event.target.checked)
                                }
                                type="checkbox"
                            />
                            Mostrar apenas produtos com estoque.
                        </label>
                    </div>
                </section>

                <section className="mt-8">
                    <div className="mb-6 flex flex-wrap items-center justify-between gap-4">
                        <div>
                            <p className="text-sm text-slate-500">
                                {filteredProducts.length} produto(s) nesta
                                colecao.
                            </p>
                            {productsResource.error ? (
                                <p className="mt-2 text-sm text-red-600">
                                    {productsResource.error}
                                </p>
                            ) : null}
                        </div>
                        <div className="flex flex-wrap gap-2">
                            {[
                                {
                                    label: "Ticket inicial",
                                    value: filteredProducts[0]
                                        ? getPriceLabel(
                                              filteredProducts[0].priceOptions,
                                          )
                                        : "-",
                                },
                                {
                                    label: "Estoque total",
                                    value: `${filteredProducts.reduce(
                                        (total, product) =>
                                            total + product.stock,
                                        0,
                                    )} un.`,
                                },
                                {
                                    label: "Media por item",
                                    value:
                                        filteredProducts.length > 0
                                            ? formatCurrency(
                                                  Math.round(
                                                      filteredProducts.reduce(
                                                          (total, product) =>
                                                              total +
                                                              (product
                                                                  .priceOptions[0]
                                                                  ?.priceInCents ??
                                                                  0),
                                                          0,
                                                      ) /
                                                          filteredProducts.length,
                                                  ),
                                              )
                                            : "-",
                                },
                            ].map((item) => (
                                <div
                                    key={item.label}
                                    className="rounded-full border border-white/70 bg-white/80 px-4 py-2 text-sm shadow-sm"
                                >
                                    <span className="mr-2 text-slate-500">
                                        {item.label}
                                    </span>
                                    <span className="font-semibold text-slate-900">
                                        {item.value}
                                    </span>
                                </div>
                            ))}
                        </div>
                    </div>

                    {productsResource.isLoading &&
                    !productsResource.data?.items.length ? (
                        <ProductGridSkeleton />
                    ) : (
                        <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-3">
                            {filteredProducts.map((product) => (
                                <Card
                                    key={product.uuid}
                                    className="overflow-hidden p-5"
                                >
                                    <div className="grid gap-5 lg:grid-cols-[0.9fr_1.1fr]">
                                        <div className="aspect-square overflow-hidden rounded-[1.5rem] bg-slate-100">
                                            {product.imageUrl ? (
                                                <img
                                                    alt={product.name}
                                                    className="h-full w-full object-cover"
                                                    src={product.imageUrl}
                                                />
                                            ) : null}
                                        </div>
                                        <div>
                                            <Badge className="bg-primary/10 text-primary">
                                                {product.line.name}
                                            </Badge>
                                            <h3 className="mt-3 font-display text-2xl font-bold text-slate-900">
                                                {product.name}
                                            </h3>
                                            <p className="mt-3 text-sm leading-7 text-slate-600">
                                                {product.longDescription}
                                            </p>
                                            <div className="mt-4 flex flex-wrap gap-2">
                                                {product.priceOptions.map(
                                                    (option) => (
                                                        <span
                                                            key={option.size}
                                                            className="rounded-full border border-slate-200 bg-slate-50 px-3 py-1 text-xs font-semibold text-slate-700"
                                                        >
                                                            {option.grams}g ·{" "}
                                                            {formatCurrency(
                                                                option.priceInCents,
                                                            )}
                                                        </span>
                                                    ),
                                                )}
                                            </div>
                                            <div className="mt-6 flex items-end justify-between gap-4">
                                                <div>
                                                    <p className="text-xs uppercase tracking-[0.25em] text-slate-500">
                                                        A partir de
                                                    </p>
                                                    <p className="mt-1 text-xl font-bold text-primary">
                                                        {getPriceLabel(
                                                            product.priceOptions,
                                                        )}
                                                    </p>
                                                </div>
                                                <Link
                                                    href="/carrinho"
                                                    className="rounded-full border border-primary/20 bg-primary px-4 py-2 text-sm font-semibold text-white"
                                                >
                                                    Ir para o carrinho
                                                </Link>
                                            </div>
                                        </div>
                                    </div>
                                </Card>
                            ))}
                            {!filteredProducts.length ? (
                                <Card className="p-8 text-center md:col-span-2 xl:col-span-3">
                                    <p className="font-display text-2xl font-bold text-slate-900">
                                        Nenhum produto encaixou neste recorte
                                        agora.
                                    </p>
                                    <p className="mt-3 text-sm text-slate-600">
                                        Ajuste a busca ou aguarde novos itens
                                        chegarem da API.
                                    </p>
                                </Card>
                            ) : null}
                        </div>
                    )}
                </section>
            </div>
        </main>
    );
}
