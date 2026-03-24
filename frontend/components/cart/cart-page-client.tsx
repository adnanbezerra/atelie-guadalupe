"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { Skeleton } from "@/components/ui/skeleton";
import { useCart } from "@/hooks/use-cart";
import { Cart } from "@/lib/types";
import { formatCurrency } from "@/lib/utils";

type CartPageClientProps = {
    initialCart: Cart | null;
};

export function CartPageClient({ initialCart }: CartPageClientProps) {
    const cart = useCart(initialCart);
    const [zipCode, setZipCode] = useState("");
    const shippingEstimate = zipCode.length >= 8 ? 1250 : 0;
    const taxes = Math.round(
        (cart.data?.summary.subtotalInCents ?? 0) * 0.0563,
    );

    const total = useMemo(() => {
        return (
            (cart.data?.summary.subtotalInCents ?? 0) + shippingEstimate + taxes
        );
    }, [cart.data?.summary.subtotalInCents, shippingEstimate, taxes]);

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
                            <div
                                className="size-20 shrink-0 rounded-lg bg-cover bg-center"
                                style={{
                                    backgroundImage: `url(${item.imageUrl})`,
                                }}
                            />
                            <div className="grow">
                                <p className="font-display text-base font-bold text-slate-900">
                                    {item.name}
                                </p>
                                <p className="text-xs text-slate-500">
                                    {item.grams}ml • {item.productSize}
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
        <div className="min-h-screen bg-[#f6f6f8] font-sans text-slate-900">
            <div className="relative flex min-h-screen w-full flex-col overflow-x-hidden">
                <header className="sticky top-0 z-50 flex items-center justify-between border-b border-slate-200 bg-white px-6 py-4 backdrop-blur-sm md:px-20">
                    <div className="flex items-center gap-4 text-primary">
                        <div className="size-6">
                            <svg
                                fill="currentColor"
                                viewBox="0 0 48 48"
                                xmlns="http://www.w3.org/2000/svg"
                            >
                                <path d="M44 11.2727C44 14.0109 39.8386 16.3957 33.69 17.6364C39.8386 18.877 44 21.2618 44 24C44 26.7382 39.8386 29.123 33.69 30.3636C39.8386 31.6043 44 33.9891 44 36.7273C44 40.7439 35.0457 44 24 44C12.9543 44 4 40.7439 4 36.7273C4 33.9891 8.16144 31.6043 14.31 30.3636C8.16144 29.123 4 26.7382 4 24C4 21.2618 8.16144 18.877 14.31 17.6364C8.16144 16.3957 4 14.0109 4 11.2727C4 7.25611 12.9543 4 24 4C35.0457 4 44 7.25611 44 11.2727Z" />
                            </svg>
                        </div>
                        <h2 className="font-display text-xl font-bold tracking-tight text-slate-900">
                            Ateliê Guadalupe
                        </h2>
                    </div>
                    <div className="flex flex-1 items-center justify-end gap-8">
                        <nav className="hidden items-center gap-9 md:flex">
                            <Link
                                className="text-sm font-medium text-slate-600"
                                href="/"
                            >
                                Loja
                            </Link>
                            <Link
                                className="text-sm font-medium text-slate-600"
                                href="/artesanato"
                            >
                                Artesãos
                            </Link>
                            <Link
                                className="text-sm font-medium text-slate-600"
                                href="/admin"
                            >
                                Sobre
                            </Link>
                        </nav>
                        <button className="flex h-10 w-10 items-center justify-center rounded-lg bg-slate-100 text-slate-900">
                            <span className="material-symbols-outlined text-[20px]">
                                shopping_bag
                            </span>
                        </button>
                    </div>
                </header>

                <main className="mx-auto w-full max-w-6xl flex-1 px-6 py-10 md:px-20">
                    <div className="mb-10 flex flex-col gap-2">
                        <h1 className="font-display text-4xl font-black tracking-tight text-slate-900">
                            Meu Carrinho
                        </h1>
                        <p className="text-base text-slate-500">
                            Produtos artesanais selecionados para você.
                        </p>
                    </div>

                    {cart.error ? (
                        <p className="mb-6 text-sm text-red-600">
                            {cart.error}
                        </p>
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

                            {renderSection(
                                "Botica & Cremes",
                                "spa",
                                beautyItems,
                            )}
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
                                        O backend cria o carrinho
                                        automaticamente no primeiro acesso.
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
                                                            .subtotalInCents ??
                                                            0,
                                                    )}
                                                </span>
                                            </div>
                                            <div className="space-y-2">
                                                <div className="flex justify-between text-sm">
                                                    <span className="text-slate-500">
                                                        Estimativa de Frete
                                                    </span>
                                                    <span className="font-medium">
                                                        {formatCurrency(
                                                            shippingEstimate,
                                                        )}
                                                    </span>
                                                </div>
                                                <div className="relative">
                                                    <input
                                                        className="w-full rounded-lg border-none bg-slate-50 px-3 py-2 text-xs"
                                                        onChange={(event) =>
                                                            setZipCode(
                                                                event.target
                                                                    .value,
                                                            )
                                                        }
                                                        placeholder="CEP"
                                                        value={zipCode}
                                                    />
                                                    <button
                                                        className="absolute right-2 top-1/2 -translate-y-1/2 text-[10px] font-bold uppercase tracking-wider text-primary"
                                                        type="button"
                                                    >
                                                        Calcular
                                                    </button>
                                                </div>
                                            </div>
                                            <div className="flex justify-between text-sm">
                                                <span className="text-slate-500">
                                                    Impostos
                                                </span>
                                                <span className="font-medium">
                                                    {formatCurrency(taxes)}
                                                </span>
                                            </div>
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
                                        Nota: Nossos produtos são feitos à mão
                                        em pequenos lotes. Pequenas variações de
                                        textura e cor são prova de sua origem
                                        artesanal.
                                    </p>
                                </div>
                            </div>
                        </aside>
                    </div>
                </main>

                <footer className="mt-20 border-t border-slate-200 bg-white px-6 py-10 md:px-20">
                    <div className="mx-auto flex max-w-6xl flex-col items-center justify-between gap-6 md:flex-row">
                        <div className="flex items-center gap-2 opacity-60">
                            <span className="material-symbols-outlined text-sm">
                                auto_awesome
                            </span>
                        </div>
                        <div className="flex gap-8">
                            <Link className="text-xs text-slate-500" href="/">
                                Política de Devolução
                            </Link>
                            <Link className="text-xs text-slate-500" href="/">
                                Sustentabilidade
                            </Link>
                            <Link className="text-xs text-slate-500" href="/">
                                Contato
                            </Link>
                        </div>
                    </div>
                </footer>
            </div>
        </div>
    );
}
