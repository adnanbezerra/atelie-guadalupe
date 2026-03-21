"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
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
        const filteredByStock = onlyLowStock
            ? items.filter((product) => product.stock <= LOW_STOCK_THRESHOLD)
            : items;
        return filteredByStock;
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
        <div className="min-h-screen bg-[#f6f6f8] text-slate-900">
            <div className="flex h-screen overflow-hidden">
                <aside className="hidden w-64 flex-col border-r border-slate-200 bg-white lg:flex">
                    <div className="flex items-center gap-3 p-6">
                        <div className="flex size-10 items-center justify-center rounded-lg bg-primary text-white">
                            <span className="material-symbols-outlined">
                                auto_awesome
                            </span>
                        </div>
                        <h2 className="font-display text-xl font-bold text-primary">
                            Guadalupe
                        </h2>
                    </div>
                    <nav className="flex-1 space-y-2 px-4 py-4">
                        <Link
                            className="flex items-center gap-3 rounded-lg px-3 py-2 text-slate-600"
                            href="/admin"
                        >
                            <span className="material-symbols-outlined">
                                dashboard
                            </span>
                            <span className="font-medium">Dashboard</span>
                        </Link>
                        <Link
                            className="flex items-center gap-3 rounded-lg bg-primary px-3 py-2 text-white shadow-md shadow-primary/20"
                            href="/admin/produtos"
                        >
                            <span className="material-symbols-outlined">
                                inventory_2
                            </span>
                            <span className="font-medium">Produtos</span>
                        </Link>
                        <Link
                            className="flex items-center gap-3 rounded-lg px-3 py-2 text-slate-600"
                            href="/admin/cobranca"
                        >
                            <span className="material-symbols-outlined">
                                shopping_cart
                            </span>
                            <span className="font-medium">Vendas</span>
                        </Link>
                        <Link
                            className="flex items-center gap-3 rounded-lg px-3 py-2 text-slate-600"
                            href="/admin/usuarios"
                        >
                            <span className="material-symbols-outlined">
                                group
                            </span>
                            <span className="font-medium">Clientes</span>
                        </Link>
                    </nav>
                </aside>

                <main className="flex flex-1 flex-col overflow-y-auto">
                    <header className="sticky top-0 z-10 flex h-16 items-center justify-between border-b border-slate-200 bg-white px-8">
                        <div className="flex max-w-md flex-1 items-center">
                            <div className="relative w-full">
                                <span className="material-symbols-outlined absolute top-1/2 left-3 -translate-y-1/2 text-slate-400">
                                    search
                                </span>
                                <input
                                    className="w-full rounded-lg bg-slate-100 py-2 pr-4 pl-10 text-sm outline-none"
                                    onChange={(event) =>
                                        setSearch(event.target.value)
                                    }
                                    placeholder="Buscar produtos, categorias ou SKU..."
                                    value={search}
                                />
                            </div>
                        </div>
                        <div className="flex items-center gap-4">
                            <button className="relative rounded-full p-2 text-slate-500">
                                <span className="material-symbols-outlined">
                                    notifications
                                </span>
                                <span className="absolute top-2 right-2 size-2 rounded-full bg-red-500" />
                            </button>
                        </div>
                    </header>

                    <div className="mx-auto w-full max-w-7xl p-8">
                        <div className="mb-8 flex flex-col justify-between gap-4 md:flex-row md:items-center">
                            <div>
                                <h1 className="font-display text-3xl font-bold text-slate-900">
                                    Gestão de Produtos
                                </h1>
                                <p className="mt-1 text-slate-500">
                                    Gerencie seu inventário de cosméticos
                                    naturais e artesanato.
                                </p>
                            </div>
                            <button className="flex items-center justify-center gap-2 rounded-xl bg-primary px-6 py-3 font-bold text-white">
                                <span className="material-symbols-outlined">
                                    add
                                </span>
                                Adicionar Novo Produto
                            </button>
                        </div>

                        <div className="mb-8 grid grid-cols-1 gap-6 lg:grid-cols-4">
                            {[
                                {
                                    icon: "inventory",
                                    tone: "bg-primary/10 text-primary",
                                    label: "Total Produtos",
                                    value: `${stats.total}`,
                                },
                                {
                                    icon: "warning",
                                    tone: "bg-amber-100 text-amber-600",
                                    label: "Estoque Baixo",
                                    value: `${stats.lowStock}`,
                                },
                                {
                                    icon: "eco",
                                    tone: "bg-emerald-100 text-emerald-600",
                                    label: "Beleza Natural",
                                    value: `${stats.beauty}`,
                                },
                                {
                                    icon: "brush",
                                    tone: "bg-purple-100 text-purple-600",
                                    label: "Artesanato",
                                    value: `${stats.crafts}`,
                                },
                            ].map((item) => (
                                <div
                                    className="flex items-center gap-4 rounded-xl border border-slate-200 bg-white p-4 shadow-sm"
                                    key={item.label}
                                >
                                    <div
                                        className={`flex size-12 items-center justify-center rounded-lg ${item.tone}`}
                                    >
                                        <span className="material-symbols-outlined">
                                            {item.icon}
                                        </span>
                                    </div>
                                    <div>
                                        <p className="text-xs font-bold tracking-wider text-slate-500 uppercase">
                                            {item.label}
                                        </p>
                                        <p className="text-xl font-bold">
                                            {item.value}
                                        </p>
                                    </div>
                                </div>
                            ))}
                        </div>

                        <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
                            <div className="flex flex-wrap items-center justify-between gap-4 border-b border-slate-200 bg-slate-50/50 p-4">
                                <div className="flex flex-wrap gap-2">
                                    <button className="rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-white">
                                        Todos
                                    </button>
                                    <button className="rounded-lg px-4 py-2 text-sm font-semibold text-slate-600">
                                        Beleza Natural
                                    </button>
                                    <button className="rounded-lg px-4 py-2 text-sm font-semibold text-slate-600">
                                        Artesanato
                                    </button>
                                    <button
                                        className="flex items-center gap-1 rounded-lg bg-amber-50 px-4 py-2 text-sm font-semibold text-amber-600"
                                        onClick={() =>
                                            setOnlyLowStock(
                                                (current) => !current,
                                            )
                                        }
                                        type="button"
                                    >
                                        <span className="material-symbols-outlined text-sm">
                                            priority_high
                                        </span>
                                        Estoque Baixo
                                    </button>
                                </div>
                                <div className="flex items-center gap-3">
                                    <label className="text-sm text-slate-500">
                                        Ordenar por:
                                    </label>
                                    <select
                                        className="rounded-lg border border-slate-200 bg-white py-1.5 pl-3 pr-8 text-sm"
                                        onChange={(event) =>
                                            setLineUuid(event.target.value)
                                        }
                                        value={lineUuid}
                                    >
                                        <option value="">Mais Recentes</option>
                                        {lines.data.map((line) => (
                                            <option
                                                key={line.uuid}
                                                value={line.uuid}
                                            >
                                                {line.name}
                                            </option>
                                        ))}
                                    </select>
                                </div>
                            </div>

                            <div className="overflow-x-auto">
                                <table className="w-full text-left">
                                    <thead className="bg-slate-50 text-xs font-bold tracking-wider text-slate-500 uppercase">
                                        <tr>
                                            <th className="px-6 py-4">
                                                Produto
                                            </th>
                                            <th className="px-6 py-4">
                                                Categoria
                                            </th>
                                            <th className="px-6 py-4">
                                                Status Estoque
                                            </th>
                                            <th className="px-6 py-4 text-center">
                                                Quantidade
                                            </th>
                                            <th className="px-6 py-4">Preço</th>
                                            <th className="px-6 py-4 text-right">
                                                Ações
                                            </th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-slate-100">
                                        {filteredItems.map((product) => (
                                            <tr
                                                className="group transition-colors hover:bg-slate-50"
                                                key={product.uuid}
                                            >
                                                <td className="px-6 py-4">
                                                    <div className="flex items-center gap-4">
                                                        <div className="size-12 overflow-hidden rounded-lg bg-slate-200 shadow-inner">
                                                            {product.imageUrl ? (
                                                                <img
                                                                    alt={
                                                                        product.name
                                                                    }
                                                                    className="h-full w-full object-cover"
                                                                    src={
                                                                        product.imageUrl
                                                                    }
                                                                />
                                                            ) : null}
                                                        </div>
                                                        <div>
                                                            <p className="font-bold text-slate-900">
                                                                {product.name}
                                                            </p>
                                                            <p className="text-xs text-slate-500">
                                                                SKU:{" "}
                                                                {product.slug}
                                                            </p>
                                                        </div>
                                                    </div>
                                                </td>
                                                <td className="px-6 py-4">
                                                    <span className="inline-flex rounded-full bg-emerald-100 px-2.5 py-0.5 text-xs font-medium text-emerald-800">
                                                        {product.line.name}
                                                    </span>
                                                </td>
                                                <td className="px-6 py-4">
                                                    <div className="flex items-center gap-2">
                                                        <div className="h-2 w-24 overflow-hidden rounded-full bg-slate-100">
                                                            <div
                                                                className={`h-full ${
                                                                    product.stock <=
                                                                    LOW_STOCK_THRESHOLD
                                                                        ? "bg-amber-500"
                                                                        : "bg-emerald-500"
                                                                }`}
                                                                style={{
                                                                    width: `${Math.min(
                                                                        100,
                                                                        Math.max(
                                                                            12,
                                                                            product.stock *
                                                                                3,
                                                                        ),
                                                                    )}%`,
                                                                }}
                                                            />
                                                        </div>
                                                        <span className="text-xs font-medium text-slate-600">
                                                            {product.stock <=
                                                            LOW_STOCK_THRESHOLD
                                                                ? "Baixo"
                                                                : "Disponível"}
                                                        </span>
                                                    </div>
                                                </td>
                                                <td className="px-6 py-4 text-center">
                                                    <span className="text-sm font-medium">
                                                        {product.stock} un.
                                                    </span>
                                                </td>
                                                <td className="px-6 py-4 font-bold text-primary">
                                                    {formatCurrency(
                                                        product.priceOptions[0]
                                                            ?.priceInCents ?? 0,
                                                    )}
                                                </td>
                                                <td className="px-6 py-4 text-right">
                                                    <div className="flex items-center justify-end gap-2">
                                                        <button className="rounded-lg p-2 transition-colors hover:bg-primary/10 hover:text-primary">
                                                            <span className="material-symbols-outlined text-lg">
                                                                edit
                                                            </span>
                                                        </button>
                                                        <button className="rounded-lg p-2 transition-colors hover:bg-red-100 hover:text-red-600">
                                                            <span className="material-symbols-outlined text-lg">
                                                                delete
                                                            </span>
                                                        </button>
                                                    </div>
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    </div>
                </main>
            </div>
        </div>
    );
}
