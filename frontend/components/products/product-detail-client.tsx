"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { toast } from "sonner";
import { ProductImage } from "@/components/shared/product-image";
import { useCart } from "@/hooks/use-cart";
import type { PriceOption, Product } from "@/lib/types";
import {
    applyProductDiscount,
    formatCurrency,
    formatProductSizeLabel,
    getLowestPriceOption,
    normalizeDiscountPercent,
} from "@/lib/utils";
import { buildWhatsappLink } from "@/lib/whatsapp";

type ProductDetailClientProps = {
    product: Product;
};

function getCollectionHref(product: Product) {
    return product.category === "ARTISANAL" ? "/artesanato" : "/beleza-natural";
}

function getCollectionLabel(product: Product) {
    return product.category === "ARTISANAL" ? "Artesanato" : "Beleza Natural";
}

export function ProductDetailClient({ product }: ProductDetailClientProps) {
    const cart = useCart();
    const [selectedOption, setSelectedOption] = useState<PriceOption | null>(
        null,
    );
    const [isAdding, setIsAdding] = useState(false);
    const discountPercent = normalizeDiscountPercent(
        product.promotionDiscountPercent,
    );
    const priceOptions = useMemo(
        () =>
            [...product.priceOptions]
                .filter((option) => option.priceInCents > 0)
                .sort((a, b) => a.grams - b.grams),
        [product.priceOptions],
    );
    const hasValidPrice = Boolean(getLowestPriceOption(product.priceOptions));
    const whatsappLink = buildWhatsappLink(
        `Olá, vim pelo website e gostaria de consultar o produto ${product.name}.`,
    );

    async function handleAddToCart() {
        if (!selectedOption) {
            toast.error("Escolha um tamanho antes de adicionar ao carrinho.");
            return;
        }

        setIsAdding(true);

        try {
            const errorMessage = await cart.addItem({
                productUuid: product.uuid,
                productSize: selectedOption.size,
                quantity: 1,
                optimisticProduct: product,
            });

            if (errorMessage) {
                toast.error("Não foi possível adicionar ao carrinho.", {
                    description: errorMessage,
                });
                return;
            }

            toast.success("Produto adicionado ao carrinho.", {
                description: `Tamanho: ${formatProductSizeLabel(selectedOption.grams)}`,
            });
        } finally {
            setIsAdding(false);
        }
    }

    return (
        <main className="bg-[#f7f3ed] text-slate-950">
            <section className="mx-auto grid min-h-[calc(100vh-83px)] w-full max-w-7xl gap-10 px-6 py-8 md:px-10 lg:grid-cols-[0.95fr_1.05fr] lg:items-center">
                <div className="relative">
                    <div className="absolute -left-4 top-10 h-24 w-1 bg-primary" />
                    <div className="relative overflow-hidden rounded-2xl border border-white/70 bg-white shadow-2xl shadow-stone-300/50">
                        <ProductImage
                            alt={product.name}
                            className="aspect-[4/5] w-full object-cover"
                            src={product.imageUrl}
                        />
                    </div>
                    {discountPercent > 0 ? (
                        <div className="absolute right-4 top-4 rounded-full bg-emerald-700 px-4 py-2 text-xs font-black uppercase tracking-widest text-white shadow-lg">
                            {discountPercent}% OFF
                        </div>
                    ) : null}
                </div>

                <div className="flex flex-col">
                    <nav className="mb-8 flex flex-wrap items-center gap-2 text-sm font-semibold text-slate-500">
                        <Link className="hover:text-primary" href="/">
                            Home
                        </Link>
                        <span className="material-symbols-outlined text-sm">
                            chevron_right
                        </span>
                        <Link
                            className="hover:text-primary"
                            href={getCollectionHref(product)}
                        >
                            {getCollectionLabel(product)}
                        </Link>
                        <span className="material-symbols-outlined text-sm">
                            chevron_right
                        </span>
                        <span className="text-slate-900">{product.name}</span>
                    </nav>

                    <span className="mb-4 w-fit rounded-full border border-primary/20 bg-white/70 px-4 py-2 text-[11px] font-black uppercase tracking-[0.25em] text-primary">
                        {product.line.name}
                    </span>
                    <h1 className="font-display text-4xl font-black leading-tight text-slate-950 md:text-6xl">
                        {product.name}
                    </h1>
                    <p className="mt-5 max-w-2xl text-lg leading-8 text-slate-600">
                        {product.longDescription ||
                            product.description ||
                            product.shortDescription}
                    </p>

                    {hasValidPrice ? (
                        <div className="mt-10">
                            <div className="mb-4 flex items-center justify-between gap-4">
                                <h2 className="text-sm font-black uppercase tracking-widest text-slate-900">
                                    Escolha o tamanho
                                </h2>
                                {!selectedOption ? (
                                    <span className="text-xs font-bold text-primary">
                                        Obrigatório
                                    </span>
                                ) : null}
                            </div>
                            <div className="sm:grid-cols-2">
                                {priceOptions.map((option) => {
                                    const isSelected =
                                        selectedOption?.size === option.size;
                                    const finalPrice = applyProductDiscount(
                                        option.priceInCents,
                                        discountPercent,
                                    );

                                    return (
                                        <button
                                            aria-pressed={isSelected}
                                            className={
                                                isSelected
                                                    ? "mr-4 rounded-2xl border-2 border-primary bg-[#F1F5F9] p-5 text-left shadow-xl shadow-primary/10"
                                                    : "mr-4 rounded-2xl border border-slate-200 bg-white/80 p-5 text-left shadow-sm transition hover:border-primary/60 hover:bg-white"
                                            }
                                            key={option.size}
                                            onClick={() =>
                                                setSelectedOption(option)
                                            }
                                            type="button"
                                        >
                                            <span className="mt-2 block text-3xl font-black text-slate-950">
                                                {formatProductSizeLabel(
                                                    option.grams,
                                                )}
                                            </span>
                                            <span className="mt-4 flex items-end justify-between gap-3">
                                                <span className="text-right">
                                                    {discountPercent > 0 ? (
                                                        <span className="block text-xs font-bold text-slate-400 line-through">
                                                            {formatCurrency(
                                                                option.priceInCents,
                                                            )}
                                                        </span>
                                                    ) : null}
                                                    <span className="block text-xl font-black text-primary">
                                                        {formatCurrency(
                                                            finalPrice,
                                                        )}
                                                    </span>
                                                </span>
                                            </span>
                                        </button>
                                    );
                                })}
                            </div>

                            <button
                                className="mt-6 flex w-full items-center justify-center gap-2 rounded-2xl bg-slate-950 px-6 py-4 text-base font-black text-white shadow-xl shadow-slate-950/20 transition hover:bg-primary disabled:cursor-not-allowed disabled:opacity-45"
                                disabled={!selectedOption || isAdding}
                                onClick={() => void handleAddToCart()}
                                type="button"
                            >
                                {isAdding
                                    ? "Adicionando"
                                    : "Adicionar ao carrinho"}
                                <span className="material-symbols-outlined text-[20px]">
                                    shopping_bag
                                </span>
                            </button>
                        </div>
                    ) : (
                        <div className="mt-10 rounded-2xl border border-primary/10 bg-white p-6 shadow-sm">
                            <h2 className="text-lg font-black text-slate-950">
                                Produto sob consulta
                            </h2>
                            <p className="mt-2 text-sm leading-6 text-slate-500">
                                Este produto precisa de atendimento direto para
                                confirmar disponibilidade e valor.
                            </p>
                            <a
                                className="mt-5 inline-flex rounded-xl bg-emerald-600 px-5 py-3 text-sm font-black text-white"
                                href={whatsappLink}
                                rel="noopener noreferrer"
                                target="_blank"
                            >
                                Consultar pelo WhatsApp
                            </a>
                        </div>
                    )}
                </div>
            </section>
        </main>
    );
}
