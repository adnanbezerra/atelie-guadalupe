"use client";

import Link from "next/link";
import Image from "next/image";
import { useEffect, useMemo, useRef, useState, useTransition } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { CatalogPagination } from "./catalog/catalog-pagination";
import {
    ConsultationDialog,
    SizeSelectionDialog,
} from "./catalog/catalog-dialogs";
import { ProductCard } from "./catalog/product-card";
import { ProductLineFilter } from "./catalog/product-line-filter";
import { PersonalDiagnosisDialog } from "@/components/home/personal-diagnosis-dialog";
import { FeedbackDialog } from "@/components/shared/feedback-dialog";
import { useCart } from "@/hooks/use-cart";
import { useProductLines, useProducts } from "@/hooks/use-products";
import { filterProductsByCollection } from "@/lib/catalog";
import {
    CollectionKey,
    PriceOption,
    Product,
    ProductLine,
    ProductsPayload,
} from "@/lib/types";
import { getLowestPriceOption } from "@/lib/utils";
import { buildWhatsappLink } from "@/lib/whatsapp";
import Header from "../header";

type CollectionCatalogProps = {
    collectionKey: CollectionKey;
    config: {
        title: string;
        description: string;
        heroAccent: string;
    };
    initialCatalog?: ProductsPayload;
    initialLineUuid?: string;
    initialPage?: number;
    initialSearch?: string;
    lines: ProductLine[];
};

export function CollectionCatalog({
    collectionKey,
    config,
    initialCatalog,
    initialLineUuid = "",
    initialPage = 1,
    initialSearch = "",
    lines: initialLines,
}: CollectionCatalogProps) {
    const router = useRouter();
    const pathname = usePathname();
    const searchParams = useSearchParams();
    const [search, setSearch] = useState(initialSearch);
    const [lineUuid, setLineUuid] = useState(initialLineUuid);
    const [page, setPage] = useState(initialPage);
    const pendingProductUuidsRef = useRef(new Set<string>());
    const [, renderPendingProducts] = useState(0);
    const [consultProductName, setConsultProductName] = useState<string | null>(
        null,
    );
    const [sizeProduct, setSizeProduct] = useState<Product | null>(null);
    const [feedback, setFeedback] = useState<{
        title: string;
        description: string;
    } | null>(null);
    const [dismissedError, setDismissedError] = useState<string | null>(null);
    const [, startTransition] = useTransition();
    const cart = useCart();
    const category = collectionKey === "beauty" ? "BELEZA" : "ARTESANATO";
    const linesResource = useProductLines(initialLines, {
        skipClientFetch: true,
        category,
    });
    const productsResource = useProducts(initialCatalog, {
        page,
        pageSize: 24,
        category,
        search,
        lineUuid: lineUuid || undefined,
    });
    const productLines = linesResource.lines;
    const resourceError = productsResource.error ?? linesResource.error;
    const pagination = productsResource.data?.pagination;
    const totalPages = pagination?.totalPages ?? 0;
    const pageNumbers = useMemo(() => {
        if (totalPages <= 0) {
            return [];
        }

        return Array.from({ length: totalPages }, (_, index) => index + 1);
    }, [totalPages]);

    const filteredProducts = useMemo(() => {
        const items = productsResource.data?.items ?? [];

        return filterProductsByCollection(items, collectionKey);
    }, [collectionKey, productsResource.data?.items]);

    useEffect(() => {
        setSearch(initialSearch);
    }, [initialSearch]);

    useEffect(() => {
        setLineUuid(initialLineUuid);
    }, [initialLineUuid]);

    useEffect(() => {
        setPage(initialPage);
    }, [initialPage]);

    useEffect(() => {
        if (totalPages > 0 && page > totalPages) {
            setPage(totalPages);
        }
    }, [page, totalPages]);

    useEffect(() => {
        const timeout = window.setTimeout(() => {
            const nextParams = new URLSearchParams(searchParams.toString());

            if (search.trim()) {
                nextParams.set("search", search.trim());
            } else {
                nextParams.delete("search");
            }

            if (lineUuid) {
                nextParams.set("lineUuid", lineUuid);
            } else {
                nextParams.delete("lineUuid");
            }

            if (page > 1) {
                nextParams.set("page", String(page));
            } else {
                nextParams.delete("page");
            }

            const query = nextParams.toString();
            const href = query ? `${pathname}?${query}` : pathname;
            const currentHref = searchParams.toString()
                ? `${pathname}?${searchParams.toString()}`
                : pathname;

            if (href === currentHref) {
                return;
            }

            startTransition(() => {
                router.replace(href, { scroll: false });
            });
        }, 250);

        return () => {
            window.clearTimeout(timeout);
        };
    }, [
        lineUuid,
        page,
        pathname,
        router,
        search,
        searchParams,
        startTransition,
    ]);

    function handleSearchChange(value: string) {
        setDismissedError(null);
        setSearch(value);
        setPage(1);
    }

    function handleLineChange(value: string) {
        setDismissedError(null);
        setLineUuid(value);
        setPage(1);
    }

    function handlePageChange(value: number) {
        const nextPage = Math.min(Math.max(value, 1), Math.max(totalPages, 1));

        if (nextPage === page) {
            return;
        }

        setDismissedError(null);
        setPage(nextPage);
        window.scrollTo({ top: 0, behavior: "smooth" });
    }

    function handleRequestAddToCart(
        product: (typeof filteredProducts)[number],
    ) {
        if (!getLowestPriceOption(product.priceOptions)) {
            setConsultProductName(product.name);
            return;
        }

        setSizeProduct(product);
    }

    async function handleAddToCart(
        product: (typeof filteredProducts)[number],
        priceOption: PriceOption,
    ) {
        if (priceOption.priceInCents <= 0) {
            setConsultProductName(product.name);
            return;
        }

        if (pendingProductUuidsRef.current.has(product.uuid)) {
            return;
        }

        pendingProductUuidsRef.current.add(product.uuid);
        renderPendingProducts((count) => count + 1);

        try {
            const errorMessage = await cart.addItem({
                productUuid: product.uuid,
                productSize: priceOption.size,
                quantity: 1,
                optimisticProduct: product,
            });

            if (errorMessage) {
                setFeedback({
                    title: "Não foi possível adicionar ao carrinho",
                    description: errorMessage,
                });
            } else {
                setSizeProduct(null);
            }
        } finally {
            pendingProductUuidsRef.current.delete(product.uuid);
            renderPendingProducts((count) => count + 1);
        }
    }

    const whatsappLink = buildWhatsappLink(
        consultProductName
            ? `Olá, vim pelo website e gostaria de consultar o produto ${consultProductName}.`
            : "Olá, vim pelo website e gostaria de consultar um produto.",
    );
    const feedbackDialog = (
        <FeedbackDialog
            description={feedback?.description ?? resourceError ?? ""}
            onOpenChange={(open) => {
                if (open) return;

                if (feedback) {
                    setFeedback(null);
                } else {
                    setDismissedError(resourceError);
                }
            }}
            open={
                Boolean(feedback) ||
                Boolean(resourceError && resourceError !== dismissedError)
            }
            title={feedback?.title ?? "Não foi possível carregar o catálogo"}
        />
    );

    if (collectionKey === "crafts") {
        return (
            <div className="min-h-screen bg-neutral-50 text-neutral-900">
                <Header
                    activeCollection="crafts"
                    search={search}
                    setSearch={handleSearchChange}
                />

                <main
                    aria-label={config.title}
                    className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8 lg:py-12"
                >
                    <nav
                        aria-label="Navegação estrutural"
                        className="mb-7 flex items-center gap-2 text-sm text-neutral-600"
                    >
                        <Link href="/">Home</Link>
                        <span
                            aria-hidden="true"
                            className="material-symbols-outlined text-xs"
                        >
                            chevron_right
                        </span>
                        <span className="font-medium text-[#4A3728]">
                            Artesanato
                        </span>
                    </nav>

                    <header className="mb-10 max-w-4xl md:mb-12">
                        <h1 className="text-balance font-display text-4xl font-bold leading-tight text-neutral-950 md:text-5xl">
                            Artesanato Autoral e Sacro
                        </h1>
                        <p className="mt-4 max-w-3xl text-base leading-7 text-neutral-600 sm:text-lg sm:leading-8">
                            Peças exclusivas que unem a tradição da arte sacra
                            católica à delicadeza do fazer manual. Cada item é
                            criado com oração e técnica, transformando materiais
                            nobres em expressões de fé e beleza para o seu lar e
                            liturgia.
                        </p>
                    </header>
                    <div className="flex flex-col gap-12 lg:flex-row">
                        <aside className="w-full rounded-xl bg-[#f8f5ef] p-4 lg:w-64 lg:flex-shrink-0 lg:self-start">
                            <div className="space-y-8 lg:sticky lg:top-40">
                                <ProductLineFilter
                                    lines={productLines}
                                    onChange={handleLineChange}
                                    selectedUuid={lineUuid}
                                    variant="crafts"
                                />
                            </div>
                        </aside>

                        <div className="min-w-0 flex-1">
                            <CatalogStatus
                                count={filteredProducts.length}
                                isLoading={productsResource.isLoading}
                            />
                            {filteredProducts.length ? (
                                <div className="grid grid-cols-1 gap-x-6 gap-y-10 sm:grid-cols-2 xl:grid-cols-3">
                                    {filteredProducts.map((product) => (
                                        <ProductCard
                                            isPending={pendingProductUuidsRef.current.has(
                                                product.uuid,
                                            )}
                                            key={product.uuid}
                                            onBuy={handleRequestAddToCart}
                                            product={product}
                                            variant="crafts"
                                        />
                                    ))}
                                </div>
                            ) : !productsResource.isLoading ? (
                                <CatalogEmpty
                                    hasFilters={Boolean(
                                        search.trim() || lineUuid,
                                    )}
                                    onClear={() => {
                                        handleSearchChange("");
                                        handleLineChange("");
                                    }}
                                />
                            ) : null}
                            <CatalogPagination
                                currentPage={page}
                                onChange={handlePageChange}
                                pageNumbers={pageNumbers}
                                totalPages={totalPages}
                            />
                        </div>
                    </div>
                </main>
                <ConsultationDialog
                    onClose={() => setConsultProductName(null)}
                    productName={consultProductName}
                    whatsappLink={whatsappLink}
                />
                <SizeSelectionDialog
                    isPending={Boolean(
                        sizeProduct &&
                        pendingProductUuidsRef.current.has(sizeProduct.uuid),
                    )}
                    onAdd={(product, option) =>
                        void handleAddToCart(product, option)
                    }
                    onClose={() => setSizeProduct(null)}
                    product={sizeProduct}
                />
                {feedbackDialog}
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-[#f6f6f8] text-slate-900">
            <Header
                activeCollection="beauty"
                search={search}
                setSearch={handleSearchChange}
            />
            <main
                aria-label={config.title}
                className="mx-auto w-full max-w-7xl px-4 py-8 sm:px-6 md:px-10 lg:py-12"
            >
                <nav
                    aria-label="Navegação estrutural"
                    className="mb-7 flex items-center gap-2 text-sm text-slate-600"
                >
                    <Link href="/">Home</Link>
                    <span
                        aria-hidden="true"
                        className="material-symbols-outlined text-xs"
                    >
                        chevron_right
                    </span>
                    <Link href="/beleza-natural">Beleza Natural</Link>
                    <span
                        aria-hidden="true"
                        className="material-symbols-outlined text-xs"
                    >
                        chevron_right
                    </span>
                    <span className="font-medium text-slate-900">Cremes</span>
                </nav>

                <section className="mb-10 md:mb-12">
                    <div className="grid grid-cols-1 items-center gap-8 lg:grid-cols-3">
                        <div className="flex flex-col justify-center lg:col-span-2">
                            <h1 className="text-balance font-display text-4xl font-bold leading-tight text-slate-950 md:text-5xl">
                                Cremes de Sebo Bovino Clarificado
                            </h1>
                            <p className="mt-4 max-w-2xl text-base leading-7 text-slate-600 sm:text-lg sm:leading-8">
                                Fórmulas de sebo clarificado feitos por uma
                                especialista, sem odor e sem reações negativas,
                                ricas em óleos essenciais puros. Hidratação
                                profunda que respeita o equilíbrio natural da
                                sua pele.
                            </p>
                        </div>
                        <div className="aspect-[4/3] overflow-hidden rounded-xl bg-slate-100 shadow-lg lg:aspect-square">
                            <Image
                                alt="Creme natural artesanal do Ateliê Guadalupe"
                                className="h-full w-full object-cover"
                                height={900}
                                sizes="(min-width: 1024px) 30vw, 100vw"
                                src="/banner.webp"
                                width={1200}
                            />
                        </div>
                    </div>
                </section>

                <div className="flex flex-col gap-10 md:flex-row">
                    <aside className="w-full space-y-8 md:w-64 md:flex-shrink-0 md:self-start">
                        <div className="relative flex min-h-[300px] items-end overflow-hidden rounded-xl bg-primary p-6 md:min-h-[330px]">
                            <div className="absolute inset-0 bg-[linear-gradient(to_bottom,rgba(15,23,42,0.08),rgba(15,23,42,0.86)),url('/personalizado.webp')] bg-cover bg-center" />
                            <div className="relative z-10 w-full">
                                <h3 className="font-display text-xl leading-tight font-bold text-white">
                                    Crie seu Creme Personalizado
                                </h3>
                                <p className="mt-3 text-sm leading-6 text-white/80">
                                    Receba atendimento personalizado para os
                                    ativos e o cuidado ideal para a sua
                                    necessidade.
                                </p>
                                <PersonalDiagnosisDialog
                                    trigger={
                                        <button
                                            className="mt-5 block min-h-12 w-full rounded-lg bg-white px-3 py-3 text-center text-sm font-bold text-primary hover:bg-white/90"
                                            type="button"
                                        >
                                            Falar com atendimento
                                        </button>
                                    }
                                />
                            </div>
                        </div>
                        <ProductLineFilter
                            lines={productLines}
                            onChange={handleLineChange}
                            selectedUuid={lineUuid}
                            variant="beauty"
                        />
                    </aside>

                    <div className="min-w-0 flex-1">
                        <CatalogStatus
                            count={filteredProducts.length}
                            isLoading={productsResource.isLoading}
                        />
                        {filteredProducts.length ? (
                            <div className="grid grid-cols-1 gap-x-6 gap-y-10 sm:grid-cols-2 lg:grid-cols-3">
                                {filteredProducts.map((product) => (
                                    <ProductCard
                                        isPending={pendingProductUuidsRef.current.has(
                                            product.uuid,
                                        )}
                                        key={product.uuid}
                                        onBuy={handleRequestAddToCart}
                                        product={product}
                                        variant="beauty"
                                    />
                                ))}
                            </div>
                        ) : !productsResource.isLoading ? (
                            <CatalogEmpty
                                hasFilters={Boolean(search.trim() || lineUuid)}
                                onClear={() => {
                                    handleSearchChange("");
                                    handleLineChange("");
                                }}
                            />
                        ) : null}
                        <CatalogPagination
                            currentPage={page}
                            onChange={handlePageChange}
                            pageNumbers={pageNumbers}
                            totalPages={totalPages}
                        />
                    </div>
                </div>
            </main>
            <ConsultationDialog
                onClose={() => setConsultProductName(null)}
                productName={consultProductName}
                whatsappLink={whatsappLink}
            />
            <SizeSelectionDialog
                isPending={Boolean(
                    sizeProduct &&
                    pendingProductUuidsRef.current.has(sizeProduct.uuid),
                )}
                onAdd={(product, option) =>
                    void handleAddToCart(product, option)
                }
                onClose={() => setSizeProduct(null)}
                product={sizeProduct}
            />
            {feedbackDialog}
        </div>
    );
}

function CatalogStatus({
    count,
    isLoading,
}: {
    count: number;
    isLoading: boolean;
}) {
    return (
        <div className="mb-6 flex min-h-6 items-center justify-between gap-4">
            <p className="text-sm text-slate-600" role="status">
                <span className="font-bold text-slate-950">{count}</span>{" "}
                {count === 1 ? "produto encontrado" : "produtos encontrados"}
            </p>
            {isLoading ? (
                <span className="text-sm font-medium text-primary">
                    Atualizando catálogo...
                </span>
            ) : null}
        </div>
    );
}

function CatalogEmpty({
    hasFilters,
    onClear,
}: {
    hasFilters: boolean;
    onClear: () => void;
}) {
    return (
        <section className="rounded-xl border border-dashed border-slate-300 bg-white px-6 py-12 text-center">
            <span
                aria-hidden="true"
                className="material-symbols-outlined text-4xl text-primary"
            >
                inventory_2
            </span>
            <h2 className="mt-4 font-display text-2xl font-bold text-slate-950">
                {hasFilters
                    ? "Nenhum produto combina com sua busca"
                    : "Novos produtos chegam em breve"}
            </h2>
            <p className="mx-auto mt-2 max-w-md text-sm leading-6 text-slate-600">
                {hasFilters
                    ? "Limpe a busca e os filtros para ver todo o catálogo disponível."
                    : "O ateliê está preparando esta coleção. Volte em breve para conhecer as novidades."}
            </p>
            {hasFilters ? (
                <button
                    className="mt-6 min-h-11 rounded-lg bg-primary px-5 py-3 text-sm font-bold text-white hover:bg-primary/90"
                    onClick={onClear}
                    type="button"
                >
                    Limpar busca e filtros
                </button>
            ) : null}
        </section>
    );
}
