"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
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
    const shippingEstimate = zipCode.length >= 8 ? 1850 : 0;

    const total = useMemo(() => {
        if (!cart.data) {
            return 0;
        }

        return cart.data.summary.subtotalInCents + shippingEstimate;
    }, [cart.data, shippingEstimate]);

    return (
        <main className="px-4 py-8 sm:px-6 lg:px-8">
            <div className="mx-auto max-w-7xl">
                <div className="mb-10">
                    <h1 className="font-display text-4xl font-bold text-slate-900">
                        Meu Carrinho
                    </h1>
                    <p className="mt-2 text-sm text-slate-600">
                        A tela segue o Stitch e usa o carrinho autenticado do
                        backend como fonte da verdade.
                    </p>
                    {cart.error ? (
                        <p className="mt-3 text-sm text-red-600">
                            {cart.error}
                        </p>
                    ) : null}
                </div>

                <div className="grid gap-8 lg:grid-cols-[1.25fr_0.75fr]">
                    <div className="space-y-6">
                        {cart.isLoading && !cart.data
                            ? Array.from({ length: 3 }).map((_, index) => (
                                  <Card key={index} className="p-5">
                                      <div className="flex gap-4">
                                          <Skeleton className="size-24 rounded-[1.25rem]" />
                                          <div className="flex-1">
                                              <Skeleton className="h-6 w-48" />
                                              <Skeleton className="mt-3 h-4 w-32" />
                                              <Skeleton className="mt-4 h-4 w-20" />
                                          </div>
                                      </div>
                                  </Card>
                              ))
                            : null}

                        {cart.data?.items.map((item) => (
                            <Card key={item.uuid} className="p-5">
                                <div className="flex flex-col gap-4 md:flex-row md:items-center">
                                    <div className="size-24 overflow-hidden rounded-[1.25rem] bg-slate-100">
                                        {item.imageUrl ? (
                                            <img
                                                alt={item.name}
                                                className="h-full w-full object-cover"
                                                src={item.imageUrl}
                                            />
                                        ) : null}
                                    </div>
                                    <div className="min-w-0 flex-1">
                                        <h2 className="font-display text-2xl font-bold text-slate-900">
                                            {item.name}
                                        </h2>
                                        <p className="mt-2 text-sm text-slate-500">
                                            {item.grams}g · {item.productSize} ·{" "}
                                            {item.isAvailable
                                                ? "Disponivel"
                                                : "Indisponivel"}
                                        </p>
                                        <p className="mt-3 text-lg font-semibold text-primary">
                                            {formatCurrency(
                                                item.totalPriceInCents,
                                            )}
                                        </p>
                                    </div>
                                    <div className="flex items-center gap-3">
                                        <Button
                                            disabled={
                                                cart.isPending ||
                                                item.quantity <= 1
                                            }
                                            onClick={() =>
                                                cart.updateItem(
                                                    item.uuid,
                                                    item.quantity - 1,
                                                )
                                            }
                                            variant="outline"
                                        >
                                            -
                                        </Button>
                                        <span className="w-8 text-center text-sm font-semibold">
                                            {item.quantity}
                                        </span>
                                        <Button
                                            disabled={cart.isPending}
                                            onClick={() =>
                                                cart.updateItem(
                                                    item.uuid,
                                                    item.quantity + 1,
                                                )
                                            }
                                            variant="outline"
                                        >
                                            +
                                        </Button>
                                        <Button
                                            disabled={cart.isPending}
                                            onClick={() =>
                                                cart.removeItem(item.uuid)
                                            }
                                            variant="ghost"
                                        >
                                            Remover
                                        </Button>
                                    </div>
                                </div>
                            </Card>
                        ))}

                        {cart.data && !cart.data.items.length ? (
                            <Card className="p-10 text-center">
                                <h2 className="font-display text-2xl font-bold text-slate-900">
                                    Seu carrinho esta vazio.
                                </h2>
                                <p className="mt-3 text-sm text-slate-600">
                                    O backend cria o carrinho automaticamente no
                                    primeiro acesso.
                                </p>
                                <Link
                                    href="/beleza-natural"
                                    className="mt-6 inline-flex rounded-full bg-primary px-5 py-3 text-sm font-semibold text-white"
                                >
                                    Voltar para a vitrine
                                </Link>
                            </Card>
                        ) : null}
                    </div>

                    <aside className="space-y-6">
                        <Card className="sticky top-28 p-6">
                            <h2 className="font-display text-2xl font-bold text-slate-900">
                                Resumo do Pedido
                            </h2>
                            {cart.isLoading && !cart.data ? (
                                <div className="mt-6 space-y-4">
                                    <Skeleton className="h-4 w-full" />
                                    <Skeleton className="h-4 w-10/12" />
                                    <Skeleton className="h-4 w-8/12" />
                                    <Skeleton className="h-12 w-full" />
                                </div>
                            ) : (
                                <div className="mt-6 space-y-5">
                                    <div className="flex items-center justify-between text-sm">
                                        <span className="text-slate-500">
                                            Subtotal
                                        </span>
                                        <span className="font-semibold text-slate-900">
                                            {formatCurrency(
                                                cart.data?.summary
                                                    .subtotalInCents ?? 0,
                                            )}
                                        </span>
                                    </div>
                                    <div className="space-y-3">
                                        <div className="flex items-center justify-between text-sm">
                                            <span className="text-slate-500">
                                                Estimativa de frete
                                            </span>
                                            <span className="font-semibold text-slate-900">
                                                {formatCurrency(
                                                    shippingEstimate,
                                                )}
                                            </span>
                                        </div>
                                        <Input
                                            value={zipCode}
                                            onChange={(event) =>
                                                setZipCode(event.target.value)
                                            }
                                            placeholder="Digite o CEP"
                                        />
                                    </div>
                                    <div className="border-t border-slate-200 pt-5">
                                        <div className="flex items-end justify-between">
                                            <span className="font-display text-xl font-bold text-slate-900">
                                                Total
                                            </span>
                                            <span className="text-2xl font-bold text-primary">
                                                {formatCurrency(total)}
                                            </span>
                                        </div>
                                    </div>
                                    <Button className="w-full">
                                        Finalizar Compra
                                    </Button>
                                    <Button
                                        className="w-full"
                                        disabled={
                                            cart.isPending ||
                                            !cart.data?.items.length
                                        }
                                        onClick={() => cart.clearCart()}
                                        variant="outline"
                                    >
                                        Limpar carrinho
                                    </Button>
                                </div>
                            )}
                        </Card>
                        <Card className="p-5">
                            <p className="text-xs uppercase tracking-[0.3em] text-slate-500">
                                Observacao artesanal
                            </p>
                            <p className="mt-3 text-sm leading-7 text-slate-600">
                                Pequenas variacoes de textura e cor sao
                                esperadas e fazem parte do carater manual de
                                cada peca.
                            </p>
                        </Card>
                    </aside>
                </div>
            </div>
        </main>
    );
}
