"use client";

import { useState } from "react";
import { ProductCard } from "@/components/shared/product-card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { useProducts } from "@/hooks/use-products";
import type { CollectionSlug } from "@/lib/catalog";
import {
    filterLinesByCollection,
    filterProductsByCollection,
} from "@/lib/catalog";
import type { PublicProductsPayload } from "@/lib/types";

export function CatalogPageClient({
    collection,
    initialPayload,
}: {
    collection: CollectionSlug;
    initialPayload: PublicProductsPayload;
}) {
    const [search, setSearch] = useState("");
    const [size, setSize] = useState("");
    const [inStock, setInStock] = useState(false);
    const [lineUuid, setLineUuid] = useState("");

    const query = {
        page: 1,
        pageSize: 12,
        search,
        size,
        inStock: inStock || undefined,
        lineUuid,
    };

    const resource = useProducts(query, initialPayload);
    const payload = resource.data ?? initialPayload;
    const products = filterProductsByCollection(payload.items, collection);
    const payloadLines =
        "lines" in payload && Array.isArray(payload.lines) ? payload.lines : [];
    const lines = filterLinesByCollection(payloadLines, collection);

    return (
        <section className="mx-auto max-w-7xl px-4 pt-10 sm:px-6 lg:px-8">
            <div className="grid gap-8 lg:grid-cols-[320px_1fr]">
                <Card className="h-fit p-6">
                    <Badge tone="muted">Filtros</Badge>
                    <div className="mt-6 space-y-4">
                        <div>
                            <label className="mb-2 block text-sm font-semibold">
                                Busca
                            </label>
                            <Input
                                value={search}
                                onChange={(event) =>
                                    setSearch(event.target.value)
                                }
                                placeholder="Buscar por nome..."
                            />
                        </div>
                        <div>
                            <label className="mb-2 block text-sm font-semibold">
                                Linha
                            </label>
                            <Select
                                value={lineUuid}
                                onChange={(event) =>
                                    setLineUuid(event.target.value)
                                }
                            >
                                <option value="">Todas</option>
                                {lines.map((line) => (
                                    <option key={line.uuid} value={line.uuid}>
                                        {line.name}
                                    </option>
                                ))}
                            </Select>
                        </div>
                        <div>
                            <label className="mb-2 block text-sm font-semibold">
                                Tamanho
                            </label>
                            <Select
                                value={size}
                                onChange={(event) =>
                                    setSize(event.target.value)
                                }
                            >
                                <option value="">Todos</option>
                                <option value="GRAMS_70">70g</option>
                                <option value="GRAMS_100">100g</option>
                            </Select>
                        </div>
                        <label className="flex items-center gap-3 text-sm">
                            <input
                                checked={inStock}
                                className="h-4 w-4 rounded border-border"
                                onChange={(event) =>
                                    setInStock(event.target.checked)
                                }
                                type="checkbox"
                            />
                            Exibir apenas itens em estoque
                        </label>
                    </div>
                </Card>

                <div className="space-y-6">
                    <Card className="flex flex-col gap-4 p-6 md:flex-row md:items-center md:justify-between">
                        <div>
                            <p className="text-xs font-semibold uppercase tracking-[0.24em] text-primary">
                                Catálogo vivo
                            </p>
                            <h2 className="mt-2 font-display text-3xl font-bold">
                                {collection === "beleza-natural"
                                    ? "Cremes botânicos e rituais de cuidado"
                                    : "Artesanato autoral e peças sacras"}
                            </h2>
                        </div>
                        <Button
                            variant="secondary"
                            onClick={() => void resource.refresh()}
                        >
                            Atualizar dados
                        </Button>
                    </Card>

                    {resource.isPending ? (
                        <div className="grid gap-6 md:grid-cols-2 xl:grid-cols-3">
                            {Array.from({ length: 6 }).map((_, index) => (
                                <Card
                                    key={index}
                                    className="overflow-hidden p-0"
                                >
                                    <Skeleton className="aspect-[4/5] rounded-none" />
                                    <div className="space-y-4 p-5">
                                        <Skeleton className="h-5 w-28" />
                                        <Skeleton className="h-6 w-4/5" />
                                        <Skeleton className="h-16 w-full" />
                                    </div>
                                </Card>
                            ))}
                        </div>
                    ) : (
                        <div className="grid gap-6 md:grid-cols-2 xl:grid-cols-3">
                            {products.map((product) => (
                                <ProductCard
                                    key={product.uuid}
                                    product={product}
                                />
                            ))}
                        </div>
                    )}
                </div>
            </div>
        </section>
    );
}
