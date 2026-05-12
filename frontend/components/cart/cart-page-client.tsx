"use client";

import Link from "next/link";
import { ProductImage } from "@/components/shared/product-image";
import { Skeleton } from "@/components/ui/skeleton";
import { useCart } from "@/hooks/use-cart";
import { Cart } from "@/lib/types";
import { formatCurrency } from "@/lib/utils";

type CartPageClientProps = {
    initialCart: Cart | null;
};

export function CartPageClient({ initialCart }: CartPageClientProps) {
    const cart = useCart(initialCart);
    const total = cart.data?.summary.totalInCents ?? 0;
    const couponDiscount = cart.data?.summary.couponDiscountInCents ?? 0;

    const midpoint = Math.ceil((cart.data?.items.length ?? 0) / 2);
    const beautyItems = cart.data?.items.slice(0, midpoint) ?? [];
    const craftItems = cart.data?.items.slice(midpoint) ?? [];

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
                                    {item.grams}g
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
                    Produtos artesanais selecionados para você.
                </p>
            </div>

            {cart.error ? (
                <p className="mb-6 text-sm text-red-600">{cart.error}</p>
            ) : null}

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
                                                cart.data?.summary
                                                    .subtotalInCents ?? 0,
                                            )}
                                        </span>
                                    </div>
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
                                <button
                                    className="mb-4 flex w-full items-center justify-center gap-2 rounded-xl bg-primary py-4 text-base font-bold text-white shadow-md shadow-primary/20 transition hover:bg-primary/90"
                                    type="button"
                                >
                                    Finalizar Compra
                                    <span className="material-symbols-outlined text-[18px]">
                                        arrow_forward
                                    </span>
                                </button>
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
        </main>
    );
}
