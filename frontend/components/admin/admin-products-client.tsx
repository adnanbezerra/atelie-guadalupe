"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { FeedbackDialog } from "@/components/shared/feedback-dialog";
import { ProductImage } from "@/components/shared/product-image";
import { useApiToken } from "@/hooks/use-api-token";
import { useProductLines, useProducts } from "@/hooks/use-products";
import { updateProduct } from "@/lib/api";
import { LOW_STOCK_THRESHOLD } from "@/lib/constants";
import type { Product, ProductLine, ProductsPayload } from "@/lib/types";
import { formatCurrency, getLowestPriceOption } from "@/lib/utils";

type AdminProductsClientProps = {
    initialCatalog?: ProductsPayload;
    initialLines: ProductLine[];
};

type Feedback = { title: string; description: string };

function getStock(product: { stock?: number | null }) {
    return product.stock ?? null;
}

function getStockState(product: Product) {
    const stock = getStock(product);

    if (stock === null) {
        return {
            label: "Sem controle",
            className: "bg-slate-100 text-slate-700 ring-slate-200",
        };
    }

    if (stock === 0) {
        return {
            label: "Esgotado",
            className: "bg-red-50 text-red-700 ring-red-200",
        };
    }

    if (stock <= LOW_STOCK_THRESHOLD) {
        return {
            label: "Estoque baixo",
            className: "bg-amber-50 text-amber-800 ring-amber-200",
        };
    }

    return {
        label: "Disponível",
        className: "bg-emerald-50 text-emerald-700 ring-emerald-200",
    };
}

export function AdminProductsClient({
    initialCatalog,
    initialLines,
}: AdminProductsClientProps) {
    const token = useApiToken();
    const [search, setSearch] = useState("");
    const [page, setPage] = useState(1);
    const [category, setCategory] = useState<"" | "BELEZA" | "ARTESANATO">("");
    const [lineUuid, setLineUuid] = useState("");
    const [onlyLowStock, setOnlyLowStock] = useState(false);
    const [visibility, setVisibility] = useState<"ACTIVE" | "INACTIVE" | "ALL">(
        "ALL",
    );
    const [productToToggle, setProductToToggle] = useState<Product | null>(
        null,
    );
    const [pendingProductUuid, setPendingProductUuid] = useState<string | null>(
        null,
    );
    const [feedback, setFeedback] = useState<Feedback | null>(null);
    const [isLoadErrorDismissed, setIsLoadErrorDismissed] = useState(false);
    const products = useProducts(
        {
            page,
            pageSize: 40,
            search,
            category: category || undefined,
            lineUuid: lineUuid || undefined,
            status: visibility,
        },
        initialCatalog,
        { skipClientFetch: true, token },
    );
    const lines = useProductLines(initialLines);

    const filteredItems = useMemo(() => {
        const items = products.data?.items ?? [];
        if (!onlyLowStock) return items;

        return items.filter((product) => {
            const stock = getStock(product);
            return stock !== null && stock > 0 && stock <= LOW_STOCK_THRESHOLD;
        });
    }, [onlyLowStock, products.data?.items]);

    const stats = useMemo(() => {
        const items = products.data?.items ?? [];
        return {
            pageItems: items.length,
            lowStock: items.filter((product) => {
                const stock = getStock(product);
                return (
                    stock !== null && stock > 0 && stock <= LOW_STOCK_THRESHOLD
                );
            }).length,
            outOfStock: items.filter((product) => getStock(product) === 0)
                .length,
        };
    }, [products.data?.items]);
    const pagination = products.data?.pagination;
    const hasValidTotal = Boolean(
        pagination &&
        Number.isFinite(pagination.total) &&
        pagination.total >= stats.pageItems,
    );
    const loadError = products.error ?? lines.error;

    function selectCategory(nextCategory: typeof category) {
        setCategory(nextCategory);
        setPage(1);
    }

    async function handleVisibilityChange() {
        const target = productToToggle;
        if (!target) return;

        if (!token) {
            setProductToToggle(null);
            setFeedback({
                title: "Sessão necessária",
                description: "Entre novamente para desativar este produto.",
            });
            return;
        }

        try {
            setPendingProductUuid(target.uuid);
            await updateProduct(token, target.uuid, {
                isActive: !target.isActive,
            });
            setProductToToggle(null);
            await products.refresh();
            setFeedback({
                title: target.isActive
                    ? "Produto desativado"
                    : "Produto reativado",
                description: target.isActive
                    ? "O produto saiu da vitrine e continua disponível para gestão."
                    : "O produto voltou a aparecer na vitrine.",
            });
        } catch (error) {
            setProductToToggle(null);
            setFeedback({
                title: "Não foi possível alterar a disponibilidade",
                description:
                    error instanceof Error ? error.message : "Tente novamente.",
            });
        } finally {
            setPendingProductUuid(null);
        }
    }

    return (
        <div className="flex min-h-full flex-col">
            <header className="sticky top-0 z-10 flex min-h-16 items-center border-b border-slate-200 bg-white px-4 py-3 md:px-8">
                <div className="relative w-full max-w-md">
                    <span
                        aria-hidden="true"
                        className="material-symbols-outlined absolute top-1/2 left-3 -translate-y-1/2 text-slate-400"
                    >
                        search
                    </span>
                    <input
                        aria-label="Buscar produtos pelo nome"
                        className="min-h-11 w-full rounded-lg bg-slate-100 py-2 pr-4 pl-10 text-base outline-none focus:ring-2 focus:ring-primary/30"
                        onChange={(event) => {
                            setSearch(event.target.value);
                            setPage(1);
                        }}
                        placeholder="Buscar produto pelo nome"
                        value={search}
                    />
                </div>
            </header>

            <div className="mx-auto w-full max-w-7xl p-4 md:p-8">
                <div className="mb-8 flex flex-col justify-between gap-4 md:flex-row md:items-center">
                    <div>
                        <h1 className="text-3xl font-bold text-slate-900">
                            Gestão de Produtos
                        </h1>
                        <p className="mt-1 text-slate-500">
                            Gerencie catálogo, estoque e disponibilidade.
                        </p>
                    </div>
                    <Link
                        className="flex min-h-11 items-center justify-center gap-2 rounded-xl bg-primary px-6 py-3 font-bold text-white"
                        href="/admin/produtos/novo"
                    >
                        <span
                            aria-hidden="true"
                            className="material-symbols-outlined"
                        >
                            add
                        </span>
                        Adicionar produto
                    </Link>
                </div>

                <div className="mb-8 grid grid-cols-1 gap-4 md:grid-cols-3">
                    {[
                        {
                            icon: "inventory",
                            tone: "bg-primary/10 text-primary",
                            label: "Produtos encontrados",
                            value: hasValidTotal
                                ? `${pagination?.total}`
                                : "Indisponível",
                        },
                        {
                            icon: "warning",
                            tone: "bg-amber-100 text-amber-700",
                            label: "Baixo nesta página",
                            value: `${stats.lowStock}`,
                        },
                        {
                            icon: "block",
                            tone: "bg-red-100 text-red-700",
                            label: "Esgotados nesta página",
                            value: `${stats.outOfStock}`,
                        },
                    ].map((item) => (
                        <div
                            className="flex items-center gap-4 rounded-xl border border-slate-200 bg-white p-4"
                            key={item.label}
                        >
                            <div
                                className={`flex size-12 shrink-0 items-center justify-center rounded-lg ${item.tone}`}
                            >
                                <span
                                    aria-hidden="true"
                                    className="material-symbols-outlined"
                                >
                                    {item.icon}
                                </span>
                            </div>
                            <div className="min-w-0">
                                <p className="text-xs font-bold uppercase tracking-wider text-slate-500">
                                    {item.label}
                                </p>
                                <p className="text-xl font-bold">
                                    {item.value}
                                </p>
                            </div>
                        </div>
                    ))}
                </div>

                <div className="overflow-hidden rounded-xl border border-slate-200 bg-white">
                    <div className="flex flex-wrap items-end justify-between gap-4 border-b border-slate-200 bg-slate-50/50 p-4">
                        <div className="flex flex-wrap gap-2">
                            <CategoryButton
                                active={category === ""}
                                label="Todos"
                                onClick={() => selectCategory("")}
                            />
                            <CategoryButton
                                active={category === "BELEZA"}
                                label="Beleza Natural"
                                onClick={() => selectCategory("BELEZA")}
                            />
                            <CategoryButton
                                active={category === "ARTESANATO"}
                                label="Artesanato"
                                onClick={() => selectCategory("ARTESANATO")}
                            />
                            <button
                                aria-pressed={onlyLowStock}
                                className={
                                    onlyLowStock
                                        ? "flex min-h-11 items-center gap-1 rounded-lg bg-amber-100 px-4 py-2 text-sm font-semibold text-amber-900"
                                        : "flex min-h-11 items-center gap-1 rounded-lg px-4 py-2 text-sm font-semibold text-slate-600 hover:bg-slate-100"
                                }
                                onClick={() =>
                                    setOnlyLowStock((current) => !current)
                                }
                                type="button"
                            >
                                <span
                                    aria-hidden="true"
                                    className="material-symbols-outlined text-sm"
                                >
                                    priority_high
                                </span>
                                Baixo nesta página
                            </button>
                        </div>
                        <label className="text-sm font-medium text-slate-600">
                            <span className="mb-1 block">
                                Filtrar por linha
                            </span>
                            <select
                                className="min-h-11 rounded-lg border border-slate-200 bg-white py-2 pr-8 pl-3 text-base"
                                onChange={(event) => {
                                    setLineUuid(event.target.value);
                                    setPage(1);
                                }}
                                value={lineUuid}
                            >
                                <option value="">Todas as linhas</option>
                                {lines.data.map((line) => (
                                    <option key={line.uuid} value={line.uuid}>
                                        {line.name}
                                    </option>
                                ))}
                            </select>
                        </label>
                        <label className="text-sm font-medium text-slate-600">
                            <span className="mb-1 block">Visibilidade</span>
                            <select
                                className="min-h-11 rounded-lg border border-slate-200 bg-white py-2 pr-8 pl-3 text-base"
                                onChange={(event) => {
                                    setVisibility(
                                        event.target.value as typeof visibility,
                                    );
                                    setPage(1);
                                }}
                                value={visibility}
                            >
                                <option value="ALL">Ativos e inativos</option>
                                <option value="ACTIVE">Somente ativos</option>
                                <option value="INACTIVE">
                                    Somente inativos
                                </option>
                            </select>
                        </label>
                    </div>

                    <div className="overflow-x-auto">
                        <table className="w-full text-left">
                            <thead className="bg-slate-50 text-xs font-bold uppercase tracking-wider text-slate-500">
                                <tr>
                                    <th className="px-6 py-4">Produto</th>
                                    <th className="px-6 py-4">Linha</th>
                                    <th className="px-6 py-4">Estoque</th>
                                    <th className="px-6 py-4 text-center">
                                        Quantidade
                                    </th>
                                    <th className="px-6 py-4">Preço</th>
                                    <th className="px-6 py-4">Vitrine</th>
                                    <th className="px-6 py-4 text-right">
                                        Ações
                                    </th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100">
                                {filteredItems.map((product) => {
                                    const stock = getStock(product);
                                    const stockState = getStockState(product);
                                    const lowestPrice = getLowestPriceOption(
                                        product.priceOptions,
                                    );

                                    return (
                                        <tr
                                            className="transition-colors hover:bg-slate-50"
                                            key={product.uuid}
                                        >
                                            <td className="px-6 py-4">
                                                <div className="flex min-w-56 items-center gap-4">
                                                    <div className="size-16 shrink-0 overflow-hidden rounded-lg bg-slate-200">
                                                        <ProductImage
                                                            alt={product.name}
                                                            className="h-full w-full object-cover"
                                                            sizes="64px"
                                                            src={
                                                                product.imageUrl
                                                            }
                                                        />
                                                    </div>
                                                    <div className="min-w-0">
                                                        <p className="max-w-72 truncate font-bold text-slate-900">
                                                            {product.name}
                                                        </p>
                                                        <p className="max-w-72 truncate text-xs text-slate-500">
                                                            {product.slug}
                                                        </p>
                                                    </div>
                                                </div>
                                            </td>
                                            <td className="px-6 py-4">
                                                <span className="inline-flex rounded-full bg-blue-50 px-2.5 py-1 text-xs font-medium text-blue-800">
                                                    {product.line.name}
                                                </span>
                                            </td>
                                            <td className="px-6 py-4">
                                                <span
                                                    className={`inline-flex whitespace-nowrap rounded px-2.5 py-1 text-xs font-bold ring-1 ${stockState.className}`}
                                                >
                                                    {stockState.label}
                                                </span>
                                            </td>
                                            <td className="px-6 py-4 text-center text-sm font-medium">
                                                {stock === null
                                                    ? "—"
                                                    : `${stock} un.`}
                                            </td>
                                            <td className="px-6 py-4 font-bold text-primary">
                                                {lowestPrice
                                                    ? formatCurrency(
                                                          lowestPrice.priceInCents,
                                                      )
                                                    : "Sob consulta"}
                                            </td>
                                            <td className="px-6 py-4">
                                                <span
                                                    className={
                                                        product.isActive
                                                            ? "text-sm font-bold text-emerald-700"
                                                            : "text-sm font-bold text-slate-500"
                                                    }
                                                >
                                                    {product.isActive
                                                        ? "Ativo"
                                                        : "Inativo"}
                                                </span>
                                            </td>
                                            <td className="px-6 py-4 text-right">
                                                <div className="flex items-center justify-end gap-2">
                                                    <Link
                                                        aria-label={`Editar ${product.name}`}
                                                        className="rounded-lg p-2 transition-colors hover:bg-primary/10 hover:text-primary"
                                                        href={`/admin/produtos/${product.uuid}`}
                                                    >
                                                        <span
                                                            aria-hidden="true"
                                                            className="material-symbols-outlined text-lg"
                                                        >
                                                            edit
                                                        </span>
                                                    </Link>
                                                    <button
                                                        aria-label={`${product.isActive ? "Desativar" : "Reativar"} ${product.name}`}
                                                        className="rounded-lg p-2 transition-colors hover:bg-primary/10 hover:text-primary disabled:cursor-not-allowed disabled:opacity-50"
                                                        disabled={
                                                            pendingProductUuid ===
                                                            product.uuid
                                                        }
                                                        onClick={() =>
                                                            setProductToToggle(
                                                                product,
                                                            )
                                                        }
                                                        type="button"
                                                    >
                                                        <span
                                                            aria-hidden="true"
                                                            className="material-symbols-outlined text-lg"
                                                        >
                                                            {product.isActive
                                                                ? "visibility_off"
                                                                : "visibility"}
                                                        </span>
                                                    </button>
                                                </div>
                                            </td>
                                        </tr>
                                    );
                                })}
                            </tbody>
                        </table>
                    </div>

                    {!products.isLoading && filteredItems.length === 0 ? (
                        <p className="border-t border-slate-100 px-6 py-10 text-center text-sm text-slate-500">
                            Nenhum produto corresponde aos filtros desta página.
                        </p>
                    ) : null}

                    {pagination && pagination.totalPages > 1 ? (
                        <div className="flex flex-col gap-3 border-t border-slate-200 px-6 py-4 sm:flex-row sm:items-center sm:justify-between">
                            <p className="text-sm text-slate-500">
                                Página {pagination.page} de{" "}
                                {pagination.totalPages}
                            </p>
                            <div className="flex gap-2">
                                <button
                                    className="min-h-11 rounded-lg border border-slate-200 px-4 py-2 text-sm font-bold text-slate-700 disabled:cursor-not-allowed disabled:opacity-50"
                                    disabled={products.isLoading || page <= 1}
                                    onClick={() =>
                                        setPage((current) =>
                                            Math.max(1, current - 1),
                                        )
                                    }
                                    type="button"
                                >
                                    Anterior
                                </button>
                                <button
                                    className="min-h-11 rounded-lg border border-slate-200 px-4 py-2 text-sm font-bold text-slate-700 disabled:cursor-not-allowed disabled:opacity-50"
                                    disabled={
                                        products.isLoading ||
                                        page >= pagination.totalPages
                                    }
                                    onClick={() =>
                                        setPage((current) => current + 1)
                                    }
                                    type="button"
                                >
                                    Próxima
                                </button>
                            </div>
                        </div>
                    ) : null}
                </div>
            </div>

            <FeedbackDialog
                confirmLabel={
                    productToToggle?.isActive
                        ? "Desativar produto"
                        : "Reativar produto"
                }
                description={
                    productToToggle?.isActive
                        ? "O produto sairá da vitrine, mas seus dados e imagem serão preservados."
                        : "O produto voltará à vitrine depois que o backend validar seus dados, preço, estoque e frete."
                }
                onConfirm={() => void handleVisibilityChange()}
                onOpenChange={(open) => {
                    if (!open && !pendingProductUuid) setProductToToggle(null);
                }}
                open={Boolean(productToToggle)}
                secondaryLabel="Cancelar"
                title={
                    productToToggle?.isActive
                        ? "Desativar este produto?"
                        : "Reativar este produto?"
                }
            />
            <FeedbackDialog
                description={feedback?.description ?? ""}
                onOpenChange={(open) => {
                    if (!open) setFeedback(null);
                }}
                open={Boolean(feedback)}
                title={feedback?.title ?? "Aviso"}
            />
            <FeedbackDialog
                confirmLabel="Recarregar produtos"
                description={
                    loadError ?? "Não foi possível carregar os produtos."
                }
                onConfirm={() => window.location.reload()}
                onOpenChange={(open) => setIsLoadErrorDismissed(!open)}
                open={Boolean(loadError) && !isLoadErrorDismissed}
                title="Produtos indisponíveis"
            />
        </div>
    );
}

function CategoryButton({
    active,
    label,
    onClick,
}: {
    active: boolean;
    label: string;
    onClick: () => void;
}) {
    return (
        <button
            aria-pressed={active}
            className={
                active
                    ? "min-h-11 rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-white"
                    : "min-h-11 rounded-lg px-4 py-2 text-sm font-semibold text-slate-600 hover:bg-slate-100"
            }
            onClick={onClick}
            type="button"
        >
            {label}
        </button>
    );
}
