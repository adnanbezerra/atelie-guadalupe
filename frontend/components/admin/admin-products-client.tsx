"use client";

import { useMemo, useState } from "react";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { useProductLines, useProducts } from "@/hooks/use-products";
import { LOW_STOCK_THRESHOLD } from "@/lib/constants";
import { ProductLine, ProductsPayload } from "@/lib/types";
import { formatCurrency } from "@/lib/utils";

type AdminProductsClientProps = {
    initialCatalog?: ProductsPayload;
    initialLines: ProductLine[];
};

export function AdminProductsClient({
    initialCatalog,
    initialLines,
}: AdminProductsClientProps) {
    const [search, setSearch] = useState("");
    const [lineUuid, setLineUuid] = useState("");
    const [onlyLowStock, setOnlyLowStock] = useState(false);
    const products = useProducts(initialCatalog, {
        page: 1,
        pageSize: 40,
        search,
        lineUuid: lineUuid || undefined,
    });
    const lines = useProductLines(initialLines);

    const filteredItems = useMemo(() => {
        const items = products.data?.items ?? [];
        return onlyLowStock
            ? items.filter((product) => product.stock <= LOW_STOCK_THRESHOLD)
            : items;
    }, [onlyLowStock, products.data?.items]);

    const stats = useMemo(() => {
        const items = products.data?.items ?? [];

        return {
            total: items.length,
            lowStock: items.filter(
                (product) => product.stock <= LOW_STOCK_THRESHOLD,
            ).length,
            beauty: items.filter((product) =>
                product.line.name.toLowerCase().includes("beleza"),
            ).length,
            crafts: items.filter(
                (product) =>
                    !product.line.name.toLowerCase().includes("beleza"),
            ).length,
        };
    }, [products.data?.items]);

    return (
        <div className="space-y-8">
            <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
                <div>
                    <h2 className="font-display text-4xl font-bold text-slate-900">
                        Gestao de Produtos
                    </h2>
                    <p className="mt-3 text-sm text-slate-600">
                        Busca, filtros e tabela preparados para a API de
                        produtos e linhas.
                    </p>
                </div>
                <a
                    className="inline-flex rounded-full bg-primary px-5 py-3 text-sm font-semibold text-white shadow-lg shadow-primary/20"
                    href="#novo-produto"
                >
                    Adicionar Novo Produto
                </a>
            </div>

            <div className="grid gap-5 lg:grid-cols-4">
                {[
                    { label: "Total Produtos", value: `${stats.total}` },
                    { label: "Estoque Baixo", value: `${stats.lowStock}` },
                    { label: "Beleza Natural", value: `${stats.beauty}` },
                    { label: "Artesanato", value: `${stats.crafts}` },
                ].map((item) => (
                    <Card key={item.label} className="p-5">
                        <p className="text-xs font-semibold uppercase tracking-[0.25em] text-slate-500">
                            {item.label}
                        </p>
                        {products.isLoading && !products.data?.items.length ? (
                            <Skeleton className="mt-4 h-9 w-20" />
                        ) : (
                            <p className="mt-4 text-3xl font-bold text-slate-900">
                                {item.value}
                            </p>
                        )}
                    </Card>
                ))}
            </div>

            <Card className="overflow-hidden">
                <div className="border-b border-slate-200 bg-slate-50/70 p-5">
                    <div className="grid gap-4 lg:grid-cols-[1.3fr_0.7fr_0.5fr_auto]">
                        <Input
                            onChange={(event) => setSearch(event.target.value)}
                            placeholder="Buscar produtos, categorias ou SKU..."
                            value={search}
                        />
                        <select
                            className="h-11 rounded-2xl border border-slate-200 bg-white px-4 text-sm shadow-sm outline-none focus:border-primary/50 focus:ring-4 focus:ring-primary/10"
                            onChange={(event) =>
                                setLineUuid(event.target.value)
                            }
                            value={lineUuid}
                        >
                            <option value="">Todas as linhas</option>
                            {lines.data.map((line) => (
                                <option key={line.uuid} value={line.uuid}>
                                    {line.name}
                                </option>
                            ))}
                        </select>
                        <label className="flex items-center gap-2 rounded-2xl border border-white bg-white px-4 text-sm font-medium text-slate-700 shadow-sm">
                            <input
                                checked={onlyLowStock}
                                onChange={(event) =>
                                    setOnlyLowStock(event.target.checked)
                                }
                                type="checkbox"
                            />
                            Estoque baixo
                        </label>
                        <button
                            className="rounded-2xl border border-slate-200 bg-white px-4 text-sm font-semibold text-slate-700 shadow-sm"
                            type="button"
                            onClick={() => {
                                setSearch("");
                                setLineUuid("");
                                setOnlyLowStock(false);
                            }}
                        >
                            Limpar
                        </button>
                    </div>
                </div>
                <div className="overflow-x-auto">
                    <table className="min-w-full text-left">
                        <thead className="bg-white text-xs font-semibold uppercase tracking-[0.22em] text-slate-500">
                            <tr>
                                <th className="px-6 py-4">Produto</th>
                                <th className="px-6 py-4">Categoria</th>
                                <th className="px-6 py-4">Estoque</th>
                                <th className="px-6 py-4">Preco base</th>
                                <th className="px-6 py-4 text-right">Acoes</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100 bg-white">
                            {products.isLoading && !products.data?.items.length
                                ? Array.from({ length: 5 }).map((_, index) => (
                                      <tr key={index}>
                                          <td className="px-6 py-4" colSpan={5}>
                                              <Skeleton className="h-12 w-full" />
                                          </td>
                                      </tr>
                                  ))
                                : filteredItems.map((product) => (
                                      <tr
                                          key={product.uuid}
                                          className="hover:bg-slate-50"
                                      >
                                          <td className="px-6 py-4">
                                              <div className="flex items-center gap-4">
                                                  <div className="size-12 overflow-hidden rounded-2xl bg-slate-100">
                                                      {product.imageUrl ? (
                                                          <img
                                                              alt={product.name}
                                                              className="h-full w-full object-cover"
                                                              src={
                                                                  product.imageUrl
                                                              }
                                                          />
                                                      ) : null}
                                                  </div>
                                                  <div>
                                                      <p className="font-semibold text-slate-900">
                                                          {product.name}
                                                      </p>
                                                      <p className="text-xs text-slate-500">
                                                          {product.slug}
                                                      </p>
                                                  </div>
                                              </div>
                                          </td>
                                          <td className="px-6 py-4 text-sm text-slate-600">
                                              {product.line.name}
                                          </td>
                                          <td className="px-6 py-4">
                                              <div className="flex items-center gap-3">
                                                  <div className="h-2 w-24 overflow-hidden rounded-full bg-slate-100">
                                                      <div
                                                          className={`h-full ${
                                                              product.stock <=
                                                              LOW_STOCK_THRESHOLD
                                                                  ? "bg-amber-500"
                                                                  : "bg-emerald-500"
                                                          }`}
                                                          style={{
                                                              width: `${Math.min(100, Math.max(8, product.stock * 6))}%`,
                                                          }}
                                                      />
                                                  </div>
                                                  <span className="text-sm font-semibold text-slate-700">
                                                      {product.stock} un.
                                                  </span>
                                              </div>
                                          </td>
                                          <td className="px-6 py-4 font-semibold text-primary">
                                              {formatCurrency(
                                                  product.priceOptions[0]
                                                      ?.priceInCents ?? 0,
                                              )}
                                          </td>
                                          <td className="px-6 py-4 text-right">
                                              <div className="flex justify-end gap-2">
                                                  <button className="rounded-full border border-slate-200 px-3 py-2 text-sm font-semibold text-slate-700">
                                                      Editar
                                                  </button>
                                                  <button className="rounded-full border border-red-200 px-3 py-2 text-sm font-semibold text-red-600">
                                                      Excluir
                                                  </button>
                                              </div>
                                          </td>
                                      </tr>
                                  ))}
                            {!products.isLoading && !filteredItems.length ? (
                                <tr>
                                    <td
                                        className="px-6 py-10 text-sm text-slate-500"
                                        colSpan={5}
                                    >
                                        Nenhum produto encontrado para os
                                        filtros atuais.
                                    </td>
                                </tr>
                            ) : null}
                        </tbody>
                    </table>
                </div>
            </Card>
        </div>
    );
}
