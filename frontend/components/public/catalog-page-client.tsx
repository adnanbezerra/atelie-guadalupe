"use client";

import { useMemo, useState } from "react";
import { useProductCatalog, useProductLines } from "@/hooks/use-products";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { EmptyState, ErrorState } from "@/components/ui/state";
import { Skeleton } from "@/components/ui/skeleton";
import { firstPriceInCents, formatCurrency, matchesCollection } from "@/lib/utils";

type CatalogKind = "beauty" | "craft";

const copyByKind: Record<
  CatalogKind,
  {
    title: string;
    subtitle: string;
    accent: string;
    filters: string[];
    teaser: string;
  }
> = {
  beauty: {
    title: "Cremes Botânicos",
    subtitle:
      "Coleção inspirada na tela de Beleza Natural, com filtros suaves, cards grandes e tom de botica contemplativa.",
    accent: "Personalização botânica",
    filters: ["Lavanda", "Alecrim", "Capim-Limão", "Sem Perfume"],
    teaser: "Crie seu creme personalizado",
  },
  craft: {
    title: "Artesanato Autoral e Sacro",
    subtitle:
      "Catálogo com linguagem de galeria artesanal, focado em cerâmica, devoção e peças para o lar católico.",
    accent: "Curadoria sacra",
    filters: ["Esculturas", "Cerâmica", "Oratórios", "Terços"],
    teaser: "Matéria viva e devoção",
  },
};

export function CatalogPageClient({ kind }: { kind: CatalogKind }) {
  const [search, setSearch] = useState("");
  const [selectedSize, setSelectedSize] = useState("GRAMS_70");
  const { data, isLoading, error } = useProductCatalog({
    page: 1,
    pageSize: 24,
    search,
    size: selectedSize,
  });
  const { lines } = useProductLines();
  const copy = copyByKind[kind];

  const filteredProducts = useMemo(() => {
    const items = data?.items ?? [];
    return items.filter((product) =>
      matchesCollection(
        kind,
        `${product.name} ${product.shortDescription} ${product.longDescription} ${product.line.name} ${product.line.slug}`,
      ),
    );
  }, [data?.items, kind]);

  return (
    <div className="mx-auto max-w-7xl px-4 py-10 sm:px-6 lg:px-8">
      <section className="grid gap-8 lg:grid-cols-[1.2fr_0.8fr]">
        <div>
          <Badge className="bg-[var(--color-primary-soft)] text-[var(--color-primary)]">
            {copy.accent}
          </Badge>
          <h1 className="mt-4 font-display text-5xl font-semibold">{copy.title}</h1>
          <p className="mt-4 max-w-2xl text-lg leading-8 text-[var(--color-muted)]">
            {copy.subtitle}
          </p>
        </div>
        <Card className="overflow-hidden p-0">
          <div className="bg-[linear-gradient(145deg,rgba(153,102,51,0.95),rgba(88,57,24,0.95))] p-8 text-white">
            <p className="text-xs uppercase tracking-[0.25em] text-white/70">
              Destaque do Stitch
            </p>
            <p className="mt-3 font-display text-3xl font-semibold">{copy.teaser}</p>
            <p className="mt-3 text-sm leading-7 text-white/75">
              Onde o backend ainda não expõe customização nativa, a interface já
              antecipa a experiência e deixa a integração preparada.
            </p>
          </div>
        </Card>
      </section>

      <section className="mt-12 grid gap-8 lg:grid-cols-[280px_1fr]">
        <Card className="h-fit p-6">
          <p className="text-xs font-semibold uppercase tracking-[0.28em] text-[var(--color-primary)]">
            Filtros
          </p>
          <div className="mt-6 space-y-4">
            <Input
              onChange={(event) => setSearch(event.target.value)}
              placeholder={kind === "beauty" ? "Buscar cremes..." : "Buscar arte sacra..."}
              value={search}
            />
            <div>
              <p className="text-sm font-semibold text-[var(--color-foreground)]">
                Tamanho de preço
              </p>
              <div className="mt-3 flex gap-2">
                {["GRAMS_70", "GRAMS_100"].map((size) => (
                  <Button
                    className="flex-1"
                    key={size}
                    onClick={() => setSelectedSize(size)}
                    type="button"
                    variant={selectedSize === size ? "primary" : "outline"}
                  >
                    {size === "GRAMS_70" ? "70g" : "100g"}
                  </Button>
                ))}
              </div>
            </div>
            <div>
              <p className="text-sm font-semibold text-[var(--color-foreground)]">
                Sugestões de coleção
              </p>
              <div className="mt-3 flex flex-wrap gap-2">
                {copy.filters.map((filter) => (
                  <Badge
                    className="bg-[var(--color-surface-alt)] text-[var(--color-foreground)]"
                    key={filter}
                  >
                    {filter}
                  </Badge>
                ))}
              </div>
            </div>
            <div>
              <p className="text-sm font-semibold text-[var(--color-foreground)]">
                Linhas vindas da API
              </p>
              <div className="mt-3 space-y-2 text-sm text-[var(--color-muted)]">
                {lines.map((line) => (
                  <p key={line.uuid}>{line.name}</p>
                ))}
                {!lines.length ? <p>Nenhuma linha carregada.</p> : null}
              </div>
            </div>
          </div>
        </Card>

        <div>
          <div className="mb-5 flex flex-wrap items-center justify-between gap-4">
            <p className="text-sm text-[var(--color-muted)]">
              Mostrando {filteredProducts.length} itens desta coleção
            </p>
            <Button variant="outline">Ordenar por preço</Button>
          </div>

          {error ? (
            <ErrorState
              description={error}
              title="Não foi possível carregar o catálogo."
            />
          ) : null}

          {isLoading ? (
            <div className="grid gap-6 md:grid-cols-2 xl:grid-cols-3">
              {Array.from({ length: 6 }).map((_, index) => (
                <Card className="overflow-hidden p-0" key={index}>
                  <Skeleton className="aspect-square rounded-none" />
                  <div className="space-y-4 p-6">
                    <Skeleton className="h-4 w-20" />
                    <Skeleton className="h-8 w-3/4" />
                    <Skeleton className="h-4 w-full" />
                    <Skeleton className="h-11 w-full" />
                  </div>
                </Card>
              ))}
            </div>
          ) : null}

          {!isLoading && !error && !filteredProducts.length ? (
            <EmptyState
              description="Os filtros aplicados não encontraram itens desta coleção. Se o backend usar linhas com nomes diferentes, a heurística da rota pode ser ajustada no frontend sem alterar o contrato."
              title="Nenhum produto encontrado para esta vitrine"
            />
          ) : null}

          {!isLoading && !error && filteredProducts.length ? (
            <div className="grid gap-6 md:grid-cols-2 xl:grid-cols-3">
              {filteredProducts.map((product) => (
                <Card className="overflow-hidden p-0" key={product.uuid}>
                  <div
                    className="aspect-square bg-cover bg-center"
                    style={{ backgroundImage: `url(${product.imageUrl})` }}
                  />
                  <div className="p-6">
                    <Badge className="bg-[var(--color-primary-soft)] text-[var(--color-primary)]">
                      {product.line.name}
                    </Badge>
                    <h3 className="mt-4 font-display text-3xl font-semibold">
                      {product.name}
                    </h3>
                    <p className="mt-3 text-sm leading-7 text-[var(--color-muted)]">
                      {product.shortDescription}
                    </p>
                    <div className="mt-5 flex items-center justify-between">
                      <span className="text-lg font-semibold text-[var(--color-primary)]">
                        {formatCurrency(firstPriceInCents(product.priceOptions))}
                      </span>
                      <Button size="sm">Adicionar</Button>
                    </div>
                  </div>
                </Card>
              ))}
            </div>
          ) : null}
        </div>
      </section>
    </div>
  );
}
