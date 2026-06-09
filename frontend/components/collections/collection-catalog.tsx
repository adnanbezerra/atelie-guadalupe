"use client";

import Link from "next/link";
import Image from "next/image";
import { useEffect, useMemo, useRef, useState, useTransition } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { PersonalDiagnosisDialog } from "@/components/home/personal-diagnosis-dialog";
import { ProductImage } from "@/components/shared/product-image";
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog";
import { useCart } from "@/hooks/use-cart";
import { useProductLines, useProducts } from "@/hooks/use-products";
import { filterProductsByCollection } from "@/lib/catalog";
import { CollectionKey, ProductLine, ProductsPayload } from "@/lib/types";
import {
    firstPriceInCents,
    formatCurrency,
    getPriceLabel,
    normalizeDiscountPercent,
} from "@/lib/utils";
import { buildWhatsappLink } from "@/lib/whatsapp";
import { toast } from "sonner";
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
    void config;
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
        setSearch(value);
        setPage(1);
    }

    function handleLineChange(value: string) {
        setLineUuid(value);
        setPage(1);
    }

    function handlePageChange(value: number) {
        const nextPage = Math.min(Math.max(value, 1), Math.max(totalPages, 1));

        if (nextPage === page) {
            return;
        }

        setPage(nextPage);
        window.scrollTo({ top: 0, behavior: "smooth" });
    }

    async function handleAddToCart(product: (typeof filteredProducts)[number]) {
        const priceOption = product.priceOptions[0];

        if (!priceOption || firstPriceInCents(product.priceOptions) <= 0) {
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
                toast.error("Não foi possível adicionar ao carrinho.", {
                    description: errorMessage,
                });
            }
        } finally {
            pendingProductUuidsRef.current.delete(product.uuid);
            renderPendingProducts((count) => count + 1);
        }
    }

    function renderPrice(product: (typeof filteredProducts)[number]) {
        const originalPriceInCents = firstPriceInCents(product.priceOptions);
        const discountPercent = normalizeDiscountPercent(
            product.promotionDiscountPercent,
        );

        if (originalPriceInCents <= 0) {
            return <span>Sob consulta</span>;
        }

        return (
            <span className="flex flex-col leading-tight">
                <span>
                    {getPriceLabel(product.priceOptions, discountPercent)}
                </span>
                {discountPercent > 0 ? (
                    <span className="mt-1 flex items-center gap-2 text-xs font-semibold">
                        <span className="text-neutral-400 line-through">
                            {formatCurrency(originalPriceInCents)}
                        </span>
                        <span className="rounded bg-emerald-50 px-1.5 py-0.5 text-[10px] font-bold text-emerald-700">
                            {discountPercent}% OFF
                        </span>
                    </span>
                ) : null}
            </span>
        );
    }

    const whatsappLink = buildWhatsappLink(
        consultProductName
            ? `Olá, vim pelo website e gostaria de consultar o produto ${consultProductName}.`
            : "Olá, vim pelo website e gostaria de consultar um produto.",
    );

    if (collectionKey === "crafts") {
        return (
            <div className="min-h-screen bg-neutral-50 text-neutral-900">
                <Header
                    activeCollection="crafts"
                    search={search}
                    setSearch={handleSearchChange}
                />

                <main className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
                    <nav className="mb-8 flex items-center gap-2 text-sm text-neutral-500">
                        <Link href="/">Home</Link>
                        <span className="material-symbols-outlined text-xs">
                            chevron_right
                        </span>
                        <span className="font-medium text-[#4A3728]">
                            Artesanato
                        </span>
                    </nav>

                    <header className="mb-12">
                        <h1 className="font-public text-4xl font-bold text-neutral-900">
                            Artesanato Autoral e Sacro
                        </h1>
                        <p className="mt-4 max-w-3xl text-lg text-neutral-600">
                            Peças exclusivas que unem a tradição da arte sacra
                            católica à delicadeza do fazer manual. Cada item é
                            criado com oração e técnica, transformando materiais
                            nobres em expressões de fé e beleza para o seu lar e
                            liturgia.
                        </p>
                    </header>
                    <div className="flex flex-col gap-12 lg:flex-row">
                        <aside className="w-full lg:w-64 lg:flex-shrink-0">
                            <div className="sticky top-28 space-y-8">
                                <div>
                                    <h3 className="mb-4 flex items-center gap-2 font-public font-semibold text-neutral-900">
                                        <span className="material-symbols-outlined text-[#D4AF37]">
                                            filter_list
                                        </span>
                                        Linhas de produtos
                                    </h3>
                                    <ul className="space-y-3">
                                        <li>
                                            <label className="flex cursor-pointer items-center gap-3 text-sm">
                                                <input
                                                    checked={!lineUuid}
                                                    name="craft-product-line"
                                                    onChange={() =>
                                                        handleLineChange("")
                                                    }
                                                    type="radio"
                                                />
                                                Todas as linhas
                                            </label>
                                        </li>
                                        {productLines.map((line) => (
                                            <li key={line.uuid}>
                                                <label className="flex cursor-pointer items-center gap-3 text-sm">
                                                    <input
                                                        checked={
                                                            lineUuid ===
                                                            line.uuid
                                                        }
                                                        name="craft-product-line"
                                                        onChange={() =>
                                                            handleLineChange(
                                                                line.uuid,
                                                            )
                                                        }
                                                        type="radio"
                                                    />
                                                    {line.name}
                                                </label>
                                            </li>
                                        ))}
                                        {productLines.length === 0 ? (
                                            <li className="text-sm text-neutral-500">
                                                Nenhuma linha cadastrada.
                                            </li>
                                        ) : null}
                                    </ul>
                                </div>
                            </div>
                        </aside>

                        <div className="flex-1">
                            <div className="grid grid-cols-1 gap-8 md:grid-cols-2 xl:grid-cols-3">
                                {filteredProducts.map((product) => (
                                    <div className="group" key={product.uuid}>
                                        <div className="relative mb-4 aspect-[4/5] overflow-hidden rounded-lg bg-neutral-100">
                                            <ProductImage
                                                alt={product.name}
                                                className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
                                                src={product.imageUrl}
                                            />
                                            <div className="absolute top-4 right-4 bg-white/90 px-3 py-1 text-[10px] font-bold tracking-widest uppercase text-[#4A3728]">
                                                {product.line.name}
                                            </div>
                                        </div>
                                        <h4 className="font-public text-lg font-medium text-neutral-900">
                                            {product.name}
                                        </h4>
                                        <p className="mt-1 text-sm text-neutral-500">
                                            {product.shortDescription}
                                        </p>
                                        <div className="mt-3 flex items-center justify-between">
                                            <span className="text-xl font-bold text-[#4A3728]">
                                                {renderPrice(product)}
                                            </span>
                                            <button
                                                className="rounded bg-[#4A3728] px-4 py-2 text-xs font-medium tracking-wider text-white uppercase disabled:cursor-not-allowed disabled:opacity-60"
                                                disabled={
                                                    pendingProductUuidsRef.current.has(
                                                        product.uuid,
                                                    ) ||
                                                    product.priceOptions
                                                        .length === 0
                                                }
                                                onClick={() =>
                                                    void handleAddToCart(
                                                        product,
                                                    )
                                                }
                                                type="button"
                                            >
                                                {pendingProductUuidsRef.current.has(
                                                    product.uuid,
                                                )
                                                    ? "Adicionando"
                                                    : "Comprar"}
                                            </button>
                                        </div>
                                    </div>
                                ))}
                            </div>

                            {totalPages > 1 ? (
                                <div className="mt-16 flex items-center justify-center gap-3">
                                    <button
                                        aria-label="Página anterior"
                                        className="flex h-10 w-10 items-center justify-center rounded-full border border-neutral-200 disabled:cursor-not-allowed disabled:opacity-40"
                                        disabled={page <= 1}
                                        onClick={() =>
                                            handlePageChange(page - 1)
                                        }
                                        type="button"
                                    >
                                        <span className="material-symbols-outlined text-sm">
                                            chevron_left
                                        </span>
                                    </button>
                                    {pageNumbers.map((pageNumber) => (
                                        <button
                                            aria-current={
                                                pageNumber === page
                                                    ? "page"
                                                    : undefined
                                            }
                                            className={
                                                pageNumber === page
                                                    ? "flex h-10 w-10 items-center justify-center rounded-full bg-[#4A3728] font-bold text-white"
                                                    : "flex h-10 w-10 items-center justify-center rounded-full border border-neutral-200"
                                            }
                                            key={pageNumber}
                                            onClick={() =>
                                                handlePageChange(pageNumber)
                                            }
                                            type="button"
                                        >
                                            {pageNumber}
                                        </button>
                                    ))}
                                    <button
                                        aria-label="Próxima página"
                                        className="flex h-10 w-10 items-center justify-center rounded-full border border-neutral-200 disabled:cursor-not-allowed disabled:opacity-40"
                                        disabled={page >= totalPages}
                                        onClick={() =>
                                            handlePageChange(page + 1)
                                        }
                                        type="button"
                                    >
                                        <span className="material-symbols-outlined text-sm">
                                            chevron_right
                                        </span>
                                    </button>
                                </div>
                            ) : null}
                        </div>
                    </div>
                </main>
                <Dialog
                    onOpenChange={(open) => {
                        if (!open) setConsultProductName(null);
                    }}
                    open={consultProductName != null}
                >
                    <DialogContent className="max-w-md rounded-xl bg-white p-6">
                        <DialogHeader>
                            <DialogTitle className="text-xl font-bold text-neutral-900">
                                Atendimento pelo WhatsApp
                            </DialogTitle>
                            <DialogDescription className="text-sm leading-6 text-neutral-600">
                                {consultProductName} está com preço sob consulta
                                e é tratado diretamente pelo WhatsApp. Deseja
                                abrir a conversa agora?
                            </DialogDescription>
                        </DialogHeader>
                        <div className="mt-6 flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
                            <button
                                className="rounded-lg border border-neutral-200 px-4 py-2 text-sm font-semibold text-neutral-700"
                                onClick={() => setConsultProductName(null)}
                                type="button"
                            >
                                Agora não
                            </button>
                            <a
                                className="rounded-lg bg-emerald-600 px-4 py-2 text-center text-sm font-semibold text-white"
                                href={whatsappLink}
                                rel="noopener noreferrer"
                                target="_blank"
                            >
                                Abrir WhatsApp
                            </a>
                        </div>
                    </DialogContent>
                </Dialog>
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
            <main className="mx-auto w-full max-w-7xl px-6 py-8 md:px-10">
                <nav className="mb-8 flex items-center gap-2 text-sm text-slate-500">
                    <Link href="/">Home</Link>
                    <span className="material-symbols-outlined text-xs">
                        chevron_right
                    </span>
                    <Link href="/beleza-natural">Beleza Natural</Link>
                    <span className="material-symbols-outlined text-xs">
                        chevron_right
                    </span>
                    <span className="font-medium text-slate-900">Cremes</span>
                </nav>

                <section className="mb-12">
                    <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
                        <div className="flex flex-col justify-center lg:col-span-2">
                            <h1 className="font-display text-5xl font-bold">
                                Cremes de Sebo Bovino Clarificado
                            </h1>
                            <p className="mt-4 max-w-xl text-lg text-slate-600">
                                Fórmulas de sebo clarificado feitos por uma
                                especialista, sem odor e sem reações negativas,
                                ricas em óleos essenciais puros. Hidratação
                                profunda que respeita o equilíbrio natural da
                                sua pele.
                            </p>
                        </div>
                        <div className="overflow-hidden rounded-xl bg-slate-100">
                            <img
                                alt="Beleza Natural"
                                className="h-auto w-auto"
                                src="/banner.webp"
                            />
                        </div>
                    </div>
                </section>

                <div className="flex flex-col gap-10 md:flex-row">
                    <aside className="w-full space-y-8 md:w-64 md:flex-shrink-0">
                        <div className="relative flex min-h-[300px] items-end overflow-hidden rounded-xl bg-primary p-6 md:min-h-[330px]">
                            <div className="absolute inset-0 bg-[linear-gradient(to_bottom,transparent,rgba(0,0,0,0.7)),url('https://lh3.googleusercontent.com/aida-public/AB6AXuDlA75ZIl1MTF9dZEkw8ZGtS2qRo3TYuYP0CuYTOQk8Z-W2LDeQo-HR46KdtUBc2QJKagrRvuU7WUJIb-j-5SPkN7gQ-ziWitpDvK479fJiWYaET-A6PbOyS7Zu1SrdzFu131HDyAbJZwxj1YovX4SHJomGK-yZkX8gVhqX_Am41hncNcdje8k80OT8J0WXf-Kea2LLaGSzBcy0VofU8dJkJEggzkaFJOaIM_5cCluHjgrYPTShqlqC_a7o44zzlYLEz44zxXh5VMYN')] bg-cover bg-center" />
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
                                            className="mt-5 block w-full rounded-lg bg-white px-3 py-3 text-center text-sm font-bold text-primary transition hover:bg-white/90"
                                            type="button"
                                        >
                                            Falar com atendimento
                                        </button>
                                    }
                                />
                            </div>
                        </div>
                        <div>
                            <h4 className="mb-4 border-b border-slate-200 pb-2 text-sm font-bold uppercase tracking-wider">
                                Linhas de produtos
                            </h4>
                            <div className="space-y-2">
                                <label className="flex cursor-pointer items-center gap-3 text-sm">
                                    <input
                                        checked={!lineUuid}
                                        name="product-line"
                                        onChange={() => handleLineChange("")}
                                        type="radio"
                                    />
                                    Todas as linhas
                                </label>
                                {productLines.map((line) => (
                                    <label
                                        className="flex cursor-pointer items-center gap-3 text-sm"
                                        key={line.uuid}
                                    >
                                        <input
                                            checked={lineUuid === line.uuid}
                                            name="product-line"
                                            onChange={() =>
                                                handleLineChange(line.uuid)
                                            }
                                            type="radio"
                                        />
                                        {line.name}
                                    </label>
                                ))}
                                {productLines.length === 0 ? (
                                    <p className="text-sm text-slate-500">
                                        Nenhuma linha cadastrada.
                                    </p>
                                ) : null}
                            </div>
                        </div>
                    </aside>

                    <div className="flex-1">
                        <div className="mb-6 flex items-center justify-between">
                            <p className="text-sm text-slate-500">
                                Mostrando{" "}
                                <span className="font-bold text-slate-900">
                                    {filteredProducts.length}
                                </span>{" "}
                                produtos
                            </p>
                            <div className="flex items-center gap-2">
                                {productsResource.isLoading ? (
                                    <span className="text-sm text-slate-500">
                                        Atualizando...
                                    </span>
                                ) : null}
                            </div>
                        </div>
                        <div className="grid grid-cols-1 gap-8 sm:grid-cols-2 lg:grid-cols-3">
                            {filteredProducts.map((product) => (
                                <div className="group" key={product.uuid}>
                                    <div className="relative mb-4 aspect-square overflow-hidden rounded-xl bg-slate-100">
                                        <ProductImage
                                            alt={product.name}
                                            className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
                                            src={product.imageUrl}
                                        />
                                        <div className="absolute bottom-3 left-3">
                                            <span className="rounded bg-white/90 px-2 py-1 text-[10px] font-bold tracking-widest text-primary uppercase">
                                                {product.line.name}
                                            </span>
                                        </div>
                                    </div>
                                    <h3 className="font-display text-lg font-bold">
                                        {product.name}
                                    </h3>
                                    <p className="mb-3 text-sm text-slate-500">
                                        {product.shortDescription}
                                    </p>
                                    <div className="flex items-center justify-between">
                                        <span className="text-lg font-bold">
                                            {renderPrice(product)}
                                        </span>
                                        <button
                                            className="rounded-lg bg-slate-900 px-4 py-2 text-sm font-medium text-white disabled:cursor-not-allowed disabled:opacity-60"
                                            disabled={
                                                pendingProductUuidsRef.current.has(
                                                    product.uuid,
                                                ) ||
                                                product.priceOptions.length ===
                                                    0
                                            }
                                            onClick={() =>
                                                void handleAddToCart(product)
                                            }
                                            type="button"
                                        >
                                            {pendingProductUuidsRef.current.has(
                                                product.uuid,
                                            )
                                                ? "Adicionando"
                                                : "Comprar"}
                                        </button>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>
            </main>
            <Dialog
                onOpenChange={(open) => {
                    if (!open) setConsultProductName(null);
                }}
                open={consultProductName != null}
            >
                <DialogContent className="max-w-md rounded-xl bg-white p-6">
                    <DialogHeader>
                        <DialogTitle className="text-xl font-bold text-slate-900">
                            Atendimento pelo WhatsApp
                        </DialogTitle>
                        <DialogDescription className="text-sm leading-6 text-slate-600">
                            {consultProductName} está com preço sob consulta e é
                            tratado diretamente pelo WhatsApp. Deseja abrir a
                            conversa agora?
                        </DialogDescription>
                    </DialogHeader>
                    <div className="mt-6 flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
                        <button
                            className="rounded-lg border border-slate-200 px-4 py-2 text-sm font-semibold text-slate-700"
                            onClick={() => setConsultProductName(null)}
                            type="button"
                        >
                            Agora não
                        </button>
                        <a
                            className="rounded-lg bg-emerald-600 px-4 py-2 text-center text-sm font-semibold text-white"
                            href={whatsappLink}
                            rel="noopener noreferrer"
                            target="_blank"
                        >
                            Abrir WhatsApp
                        </a>
                    </div>
                </DialogContent>
            </Dialog>
        </div>
    );
}
