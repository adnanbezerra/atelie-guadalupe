"use client";

import Link from "next/link";
import { ProductImage } from "@/components/shared/product-image";
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog";
import { Skeleton } from "@/components/ui/skeleton";
import { useCart } from "@/hooks/use-cart";
import { Cart } from "@/lib/types";
import { buildWhatsappLink } from "@/lib/whatsapp";
import {
    formatCurrency,
    formatProductSizeLabel,
    normalizeDiscountPercent,
} from "@/lib/utils";

type CartPageClientProps = {
    initialCart: Cart | null;
};

type CartItem = Cart["items"][number];

function getCartItemCategory(item: CartItem) {
    return item.category ?? item.productCategory ?? null;
}

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

function buildCartWhatsappMessage(cart: Cart | null) {
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
        "Olá, vim pelo website e gostaria de pedir orçamento de frete para estes produtos:",
        itemLines,
        discounts,
        `Total estimado dos produtos: ${formatCurrency(cart.summary.totalInCents)}`,
    ]
        .filter(Boolean)
        .join("\n\n");
}

export function CartPageClient({ initialCart }: CartPageClientProps) {
    const cart = useCart(initialCart);
    const total = cart.data?.summary.totalInCents ?? 0;
    const couponDiscount = cart.data?.summary.couponDiscountInCents ?? 0;
    const backendPromotionDiscount =
        cart.data?.summary.promotionDiscountInCents;
    const promotionDiscount =
        backendPromotionDiscount ??
        (cart.data?.items.reduce(
            (sum, item) => sum + getItemPromotionDiscountInCents(item),
            0,
        ) ||
            0);
    const subtotalBeforeDiscount =
        (cart.data?.summary.subtotalInCents ?? 0) +
        (backendPromotionDiscount === undefined ? promotionDiscount : 0);
    const hasItems = Boolean(cart.data?.items.length);
    const whatsappLink = buildWhatsappLink(buildCartWhatsappMessage(cart.data));

    const cartItems = cart.data?.items ?? [];
    const beautyItems = cartItems.filter(
        (item) => getCartItemCategory(item) === "SELFCARE",
    );
    const craftItems = cartItems.filter(
        (item) => getCartItemCategory(item) === "ARTISANAL",
    );
    const uncategorizedItems = cartItems.filter(
        (item) => getCartItemCategory(item) == null,
    );

    function renderSection(
        title: string,
        icon: string,
        items: NonNullable<typeof cart.data>["items"],
    ) {
        if (!items.length) {
            return null;
        }

        return (
            <section className="flex flex-col gap-4">
                <div className="flex items-center gap-2 border-b border-slate-200 pb-2">
                    <span className="material-symbols-outlined text-primary">
                        {icon}
                    </span>
                    <h3 className="text-lg font-bold text-slate-900">
                        {title}
                    </h3>
                </div>
                <div className="space-y-4">
                    {items.map((item) => (
                        <div
                            key={item.uuid}
                            className="flex items-center gap-4 rounded-xl border border-slate-100 bg-white p-4 shadow-sm"
                        >
                            <ProductImage
                                alt={item.name}
                                className="size-20 shrink-0 rounded-lg object-cover"
                                src={item.imageUrl}
                            />
                            <div className="grow">
                                <p className="font-display text-base font-bold text-slate-900">
                                    {item.name}
                                </p>
                                <p className="text-xs text-slate-500">
                                    Tamanho:{" "}
                                    {formatProductSizeLabel(item.grams)}
                                </p>
                                <p className="mt-1 font-bold text-primary">
                                    {formatCurrency(item.totalPriceInCents)}
                                </p>
                            </div>
                            <div className="flex items-center gap-3 rounded-lg bg-slate-50 p-1">
                                <button
                                    className="flex h-8 w-8 items-center justify-center rounded-md transition-colors hover:bg-white"
                                    disabled={
                                        cart.isPending || item.quantity <= 1
                                    }
                                    onClick={() =>
                                        cart.updateItem(
                                            item.uuid,
                                            item.quantity - 1,
                                        )
                                    }
                                    type="button"
                                >
                                    -
                                </button>
                                <span className="w-4 text-center text-sm font-medium">
                                    {item.quantity}
                                </span>
                                <button
                                    className="flex h-8 w-8 items-center justify-center rounded-md transition-colors hover:bg-white"
                                    disabled={cart.isPending}
                                    onClick={() =>
                                        cart.updateItem(
                                            item.uuid,
                                            item.quantity + 1,
                                        )
                                    }
                                    type="button"
                                >
                                    +
                                </button>
                            </div>
                        </div>
                    ))}
                </div>
            </section>
        );
    }

    return (
        <main className="mx-auto w-full max-w-6xl px-6 py-10 md:px-10">
            <div className="mb-10 flex flex-col gap-2">
                <h1 className="font-display text-4xl font-black tracking-tight text-slate-900">
                    Meu Carrinho
                </h1>
                <p className="text-base text-slate-500">
                    Produtos selecionados para você.
                </p>
            </div>

            <div className="grid grid-cols-1 gap-12 lg:grid-cols-3">
                <div className="flex flex-col gap-8 lg:col-span-2">
                    {cart.isLoading && !cart.data
                        ? Array.from({ length: 3 }).map((_, index) => (
                              <div
                                  key={index}
                                  className="rounded-xl border border-slate-100 bg-white p-4 shadow-sm"
                              >
                                  <div className="flex items-center gap-4">
                                      <Skeleton className="size-20 rounded-lg" />
                                      <div className="flex-1 space-y-3">
                                          <Skeleton className="h-5 w-48" />
                                          <Skeleton className="h-3 w-32" />
                                          <Skeleton className="h-4 w-20" />
                                      </div>
                                  </div>
                              </div>
                          ))
                        : null}

                    {renderSection("Botica & Cremes", "spa", beautyItems)}
                    {renderSection(
                        "Artesanato Feito à Mão",
                        "brush",
                        craftItems,
                    )}
                    {renderSection(
                        "Produtos no Carrinho",
                        "shopping_bag",
                        uncategorizedItems,
                    )}

                    {cart.data && !cart.data.items.length ? (
                        <div className="rounded-xl border border-slate-100 bg-white p-10 text-center shadow-sm">
                            <h2 className="font-display text-2xl font-bold text-slate-900">
                                Seu carrinho está vazio
                            </h2>
                            <p className="mt-3 text-sm text-slate-500">
                                Adicione alguns produtos para começar a comprar
                            </p>
                            <Link
                                href="/beleza-natural"
                                className="mt-6 inline-flex rounded-lg bg-primary px-6 py-3 font-bold text-white"
                            >
                                Voltar para a vitrine
                            </Link>
                        </div>
                    ) : null}
                </div>

                <aside className="flex flex-col gap-6">
                    <div className="sticky top-24 rounded-2xl border border-primary/10 bg-white p-6 shadow-lg">
                        <h4 className="mb-6 font-display text-xl font-bold text-slate-900">
                            Resumo do Pedido
                        </h4>
                        {cart.isLoading && !cart.data ? (
                            <div className="space-y-4">
                                <Skeleton className="h-4 w-full" />
                                <Skeleton className="h-4 w-full" />
                                <Skeleton className="h-10 w-full" />
                            </div>
                        ) : (
                            <>
                                <div className="mb-6 space-y-4">
                                    <div className="flex justify-between text-sm">
                                        <span className="text-slate-500">
                                            Subtotal
                                        </span>
                                        <span className="font-medium">
                                            {formatCurrency(
                                                subtotalBeforeDiscount,
                                            )}
                                        </span>
                                    </div>
                                    {promotionDiscount > 0 ? (
                                        <div className="flex justify-between text-sm">
                                            <span className="text-slate-500">
                                                Desconto promocional
                                            </span>
                                            <span className="font-medium text-emerald-700">
                                                {formatCurrency(
                                                    -promotionDiscount,
                                                )}
                                            </span>
                                        </div>
                                    ) : null}
                                    {couponDiscount > 0 ? (
                                        <div className="flex justify-between text-sm">
                                            <span className="text-slate-500">
                                                Cupom
                                            </span>
                                            <span className="font-medium">
                                                {formatCurrency(
                                                    -couponDiscount,
                                                )}
                                            </span>
                                        </div>
                                    ) : null}
                                </div>
                                <div className="mb-8 border-t border-slate-100 pt-4">
                                    <div className="flex items-baseline justify-between">
                                        <span className="font-display text-lg font-bold text-slate-900">
                                            Total
                                        </span>
                                        <span className="text-2xl font-black text-primary">
                                            {formatCurrency(total)}
                                        </span>
                                    </div>
                                </div>
                                <a
                                    aria-disabled={!hasItems}
                                    className="mb-4 flex w-full items-center justify-center gap-2 rounded-xl bg-primary py-4 text-base font-bold text-white shadow-md shadow-primary/20 transition hover:bg-primary/90 aria-disabled:pointer-events-none aria-disabled:opacity-60"
                                    href={hasItems ? whatsappLink : undefined}
                                    rel="noopener noreferrer"
                                    target="_blank"
                                >
                                    Finalizar Compra
                                    <span className="material-symbols-outlined text-[18px]">
                                        arrow_forward
                                    </span>
                                </a>
                                <button
                                    className="w-full rounded-xl border border-slate-200 py-3 text-sm font-semibold text-slate-700"
                                    disabled={
                                        cart.isPending ||
                                        !cart.data?.items.length
                                    }
                                    onClick={() => cart.clearCart()}
                                    type="button"
                                >
                                    Limpar carrinho
                                </button>
                            </>
                        )}
                    </div>

                    <div className="rounded-xl border border-dashed border-slate-300 bg-slate-50/50 p-4">
                        <div className="flex gap-3">
                            <span className="material-symbols-outlined text-primary/60">
                                eco
                            </span>
                            <p className="text-[11px] italic leading-relaxed text-slate-500">
                                Nota: Nossos produtos são feitos à mão em
                                pequenos lotes. Pequenas variações de textura e
                                cor são prova de sua origem artesanal.
                            </p>
                        </div>
                    </div>
                </aside>
            </div>
            <Dialog
                onOpenChange={(open) => {
                    if (!open) {
                        cart.dismissError();
                    }
                }}
                open={cart.error != null}
            >
                <DialogContent className="max-w-md rounded-xl bg-white p-6">
                    <DialogHeader>
                        <DialogTitle className="text-xl font-bold text-slate-900">
                            Não foi possível atualizar o carrinho
                        </DialogTitle>
                        <DialogDescription className="text-sm leading-6 text-slate-600">
                            {cart.error}
                        </DialogDescription>
                    </DialogHeader>
                    <div className="mt-6 flex justify-end">
                        <button
                            className="rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-white"
                            onClick={() => cart.dismissError()}
                            type="button"
                        >
                            Entendi
                        </button>
                    </div>
                </DialogContent>
            </Dialog>
        </main>
    );
}
