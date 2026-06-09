"use client";

import Link from "next/link";
import { ProductImage } from "@/components/shared/product-image";
import { Skeleton } from "@/components/ui/skeleton";
import { useCart } from "@/hooks/use-cart";
import type { Cart } from "@/lib/types";
import {
    formatCurrency,
    formatProductSizeLabel,
    normalizeDiscountPercent,
} from "@/lib/utils";
import { buildWhatsappLink } from "@/lib/whatsapp";

type CheckoutPageClientProps = {
    initialCart: Cart | null;
};

type CartItem = Cart["items"][number];

function getItemPromotionDiscountInCents(item: CartItem) {
    const discountPercent = normalizeDiscountPercent(
        item.promotionDiscountPercent ?? item.activePromotion?.discountPercent,
    );

    if (discountPercent <= 0 || discountPercent >= 100) {
        return 0;
    }

    const originalUnitPrice = Math.round(
        (item.unitPriceInCents * 100) / (100 - discountPercent),
    );

    return Math.max(
        0,
        (originalUnitPrice - item.unitPriceInCents) * item.quantity,
    );
}

function buildCheckoutWhatsappMessage(cart: Cart | null) {
    if (!cart?.items.length) {
        return "Olá, vim pelo website e gostaria de pedir um orçamento.";
    }

    const itemLines = cart.items
        .map(
            (item) =>
                `- ${item.quantity}x ${item.name} - Tamanho: ${formatProductSizeLabel(item.grams)}: ${formatCurrency(item.totalPriceInCents)}`,
        )
        .join("\n");
    const promotionDiscount =
        cart.summary.promotionDiscountInCents ??
        cart.items.reduce(
            (sum, item) => sum + getItemPromotionDiscountInCents(item),
            0,
        );
    const discounts = [
        promotionDiscount > 0
            ? `Desconto promocional: -${formatCurrency(promotionDiscount)}`
            : null,
        cart.summary.couponDiscountInCents > 0
            ? `Cupom: -${formatCurrency(cart.summary.couponDiscountInCents)}`
            : null,
    ]
        .filter(Boolean)
        .join("\n");

    return [
        "Olá, vim pelo website e gostaria de finalizar estes produtos:",
        itemLines,
        discounts,
        `Total estimado dos produtos: ${formatCurrency(cart.summary.totalInCents)}`,
    ]
        .filter(Boolean)
        .join("\n\n");
}

export function CheckoutPageClient({ initialCart }: CheckoutPageClientProps) {
    const cart = useCart(initialCart);
    const items = cart.data?.items ?? [];
    const total = cart.data?.summary.totalInCents ?? 0;
    const couponDiscount = cart.data?.summary.couponDiscountInCents ?? 0;
    const promotionDiscount =
        cart.data?.summary.promotionDiscountInCents ??
        items.reduce(
            (sum, item) => sum + getItemPromotionDiscountInCents(item),
            0,
        );
    const whatsappLink = buildWhatsappLink(
        buildCheckoutWhatsappMessage(cart.data),
    );

    return (
        <main className="min-h-screen bg-[#f6f6f8] px-6 py-10 text-slate-950 md:px-10">
            <div className="mx-auto grid w-full max-w-6xl gap-10 lg:grid-cols-[1fr_24rem]">
                <section>
                    <div className="mb-8">
                        <span className="text-xs font-black uppercase tracking-[0.25em] text-primary">
                            Checkout
                        </span>
                        <h1 className="mt-2 font-display text-4xl font-black tracking-tight">
                            Revisar pedido
                        </h1>
                        <p className="mt-3 max-w-2xl text-sm leading-6 text-slate-500">
                            Confira os produtos, quantidades e tamanhos antes de
                            continuar pelo WhatsApp.
                        </p>
                    </div>

                    {cart.isLoading && !cart.data ? (
                        <div className="space-y-4">
                            {[0, 1, 2].map((item) => (
                                <Skeleton
                                    className="h-28 rounded-2xl bg-white"
                                    key={item}
                                />
                            ))}
                        </div>
                    ) : null}

                    {!cart.isLoading && !items.length ? (
                        <div className="rounded-3xl border border-dashed border-slate-200 bg-white px-6 py-12 text-center shadow-sm">
                            <h2 className="font-display text-2xl font-black">
                                Seu carrinho está vazio
                            </h2>
                            <p className="mt-2 text-sm text-slate-500">
                                Adicione produtos antes de revisar o checkout.
                            </p>
                            <Link
                                className="mt-6 inline-flex rounded-xl bg-primary px-5 py-3 text-sm font-black text-white"
                                href="/beleza-natural"
                            >
                                Voltar para a vitrine
                            </Link>
                        </div>
                    ) : null}

                    <div className="space-y-4">
                        {items.map((item) => (
                            <article
                                className="flex gap-4 rounded-3xl border border-slate-100 bg-white p-4 shadow-sm"
                                key={item.uuid}
                            >
                                <ProductImage
                                    alt={item.name}
                                    className="size-24 shrink-0 rounded-2xl object-cover"
                                    src={item.imageUrl}
                                />
                                <div className="min-w-0 flex-1">
                                    <h2 className="font-display text-lg font-black text-slate-950">
                                        {item.name}
                                    </h2>
                                    <p className="mt-1 text-sm font-semibold text-slate-500">
                                        Tamanho:{" "}
                                        {formatProductSizeLabel(item.grams)}
                                    </p>
                                    <p className="mt-1 text-sm text-slate-500">
                                        Quantidade: {item.quantity}
                                    </p>
                                </div>
                                <p className="shrink-0 text-right text-base font-black text-primary">
                                    {formatCurrency(item.totalPriceInCents)}
                                </p>
                            </article>
                        ))}
                    </div>
                </section>

                <aside className="h-fit rounded-3xl border border-primary/10 bg-white p-6 shadow-xl shadow-slate-200">
                    <h2 className="font-display text-xl font-black">Resumo</h2>
                    <div className="mt-6 space-y-4 text-sm">
                        <div className="flex justify-between">
                            <span className="text-slate-500">Itens</span>
                            <span className="font-bold">
                                {cart.data?.summary.itemsCount ?? 0}
                            </span>
                        </div>
                        {promotionDiscount > 0 ? (
                            <div className="flex justify-between">
                                <span className="text-slate-500">
                                    Desconto promocional
                                </span>
                                <span className="font-bold text-emerald-700">
                                    {formatCurrency(-promotionDiscount)}
                                </span>
                            </div>
                        ) : null}
                        {couponDiscount > 0 ? (
                            <div className="flex justify-between">
                                <span className="text-slate-500">Cupom</span>
                                <span className="font-bold">
                                    {formatCurrency(-couponDiscount)}
                                </span>
                            </div>
                        ) : null}
                    </div>
                    <div className="mt-6 border-t border-slate-100 pt-5">
                        <div className="flex items-end justify-between">
                            <span className="font-display text-lg font-black">
                                Total
                            </span>
                            <span className="text-2xl font-black text-primary">
                                {formatCurrency(total)}
                            </span>
                        </div>
                    </div>
                    <a
                        aria-disabled={!items.length}
                        className="mt-6 flex w-full items-center justify-center rounded-2xl bg-primary px-5 py-4 text-sm font-black text-white shadow-lg shadow-primary/20 aria-disabled:pointer-events-none aria-disabled:opacity-50"
                        href={items.length ? whatsappLink : undefined}
                        rel="noopener noreferrer"
                        target="_blank"
                    >
                        Comprar pelo WhatsApp
                    </a>
                </aside>
            </div>
        </main>
    );
}
