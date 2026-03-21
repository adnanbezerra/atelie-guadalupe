"use client";

import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { ErrorState, EmptyState } from "@/components/ui/state";
import { Skeleton } from "@/components/ui/skeleton";
import { useCart } from "@/hooks/use-cart";
import { formatCurrency } from "@/lib/utils";

export function CartPageClient() {
    const {
        cart,
        error,
        isLoading,
        isMutating,
        updateItem,
        removeItem,
        clear,
    } = useCart();

    const subtotal = cart?.summary.subtotalInCents ?? 0;
    const shipping = cart?.items.length ? 1250 : 0;
    const taxes = Math.round(subtotal * 0.05);
    const total = subtotal + shipping + taxes;

    return (
        <div className="mx-auto max-w-7xl px-4 py-10 sm:px-6 lg:px-8">
            <div className="mb-10">
                <h1 className="font-display text-5xl font-semibold">
                    Meu Carrinho
                </h1>
                <p className="mt-3 text-lg text-[var(--color-muted)]">
                    Produtos artesanais selecionados para você.
                </p>
            </div>

            {error && !isLoading ? (
                <div className="mb-8">
                    <ErrorState
                        description={error}
                        title="Carrinho indisponível"
                    />
                </div>
            ) : null}

            {isLoading ? (
                <div className="grid gap-8 lg:grid-cols-[1.25fr_0.75fr]">
                    <div className="space-y-4">
                        {Array.from({ length: 3 }).map((_, index) => (
                            <Card className="p-4" key={index}>
                                <div className="flex gap-4">
                                    <Skeleton className="size-24" />
                                    <div className="flex-1 space-y-3">
                                        <Skeleton className="h-6 w-1/2" />
                                        <Skeleton className="h-4 w-1/3" />
                                        <Skeleton className="h-10 w-32" />
                                    </div>
                                </div>
                            </Card>
                        ))}
                    </div>
                    <Card className="p-6">
                        <Skeleton className="h-8 w-40" />
                        <div className="mt-6 space-y-4">
                            <Skeleton className="h-4 w-full" />
                            <Skeleton className="h-4 w-full" />
                            <Skeleton className="h-12 w-full" />
                        </div>
                    </Card>
                </div>
            ) : null}

            {!isLoading && cart && cart.items.length === 0 ? (
                <EmptyState
                    description="Quando a API retornar itens no carrinho autenticado, eles aparecem aqui com edição de quantidade e resumo automático."
                    title="Seu carrinho está vazio"
                />
            ) : null}

            {!isLoading && cart && cart.items.length > 0 ? (
                <div className="grid gap-8 lg:grid-cols-[1.25fr_0.75fr]">
                    <div className="space-y-6">
                        {cart.items.map((item) => (
                            <Card className="p-5" key={item.uuid}>
                                <div className="flex flex-col gap-4 sm:flex-row sm:items-center">
                                    <div
                                        className="size-24 rounded-2xl bg-cover bg-center"
                                        style={{
                                            backgroundImage: `url(${item.imageUrl})`,
                                        }}
                                    />
                                    <div className="flex-1">
                                        <p className="font-display text-2xl font-semibold">
                                            {item.name}
                                        </p>
                                        <p className="mt-1 text-sm text-[var(--color-muted)]">
                                            {item.grams}g • {item.productSize}
                                        </p>
                                        <p className="mt-3 text-base font-semibold text-[var(--color-primary)]">
                                            {formatCurrency(
                                                item.totalPriceInCents,
                                            )}
                                        </p>
                                        {!item.isAvailable ? (
                                            <p className="mt-2 text-sm font-semibold text-rose-600">
                                                Item marcado como indisponível
                                                pela API.
                                            </p>
                                        ) : null}
                                    </div>
                                    <div className="flex items-center gap-2">
                                        <Button
                                            disabled={
                                                isMutating || item.quantity <= 1
                                            }
                                            onClick={() =>
                                                updateItem(
                                                    item.uuid,
                                                    item.quantity - 1,
                                                )
                                            }
                                            variant="outline"
                                        >
                                            -
                                        </Button>
                                        <span className="min-w-10 text-center text-sm font-semibold">
                                            {item.quantity}
                                        </span>
                                        <Button
                                            disabled={isMutating}
                                            onClick={() =>
                                                updateItem(
                                                    item.uuid,
                                                    item.quantity + 1,
                                                )
                                            }
                                            variant="outline"
                                        >
                                            +
                                        </Button>
                                    </div>
                                    <Button
                                        disabled={isMutating}
                                        onClick={() => removeItem(item.uuid)}
                                        variant="ghost"
                                    >
                                        Remover
                                    </Button>
                                </div>
                            </Card>
                        ))}
                    </div>

                    <Card className="h-fit p-6">
                        <h2 className="font-display text-3xl font-semibold">
                            Resumo do Pedido
                        </h2>
                        <div className="mt-6 space-y-4 text-sm">
                            <div className="flex justify-between">
                                <span className="text-[var(--color-muted)]">
                                    Subtotal
                                </span>
                                <span>{formatCurrency(subtotal)}</span>
                            </div>
                            <div className="flex justify-between">
                                <span className="text-[var(--color-muted)]">
                                    Estimativa de frete
                                </span>
                                <span>{formatCurrency(shipping)}</span>
                            </div>
                            <div className="flex justify-between">
                                <span className="text-[var(--color-muted)]">
                                    Impostos
                                </span>
                                <span>{formatCurrency(taxes)}</span>
                            </div>
                            <div className="border-t border-[color:var(--color-border)] pt-4">
                                <div className="flex justify-between text-lg font-semibold">
                                    <span>Total</span>
                                    <span className="text-[var(--color-primary)]">
                                        {formatCurrency(total)}
                                    </span>
                                </div>
                            </div>
                        </div>
                        <Button className="mt-6 w-full" size="lg">
                            Finalizar Compra
                        </Button>
                        <Button
                            className="mt-3 w-full"
                            disabled={isMutating}
                            onClick={() => clear()}
                            variant="outline"
                        >
                            Limpar carrinho
                        </Button>
                    </Card>
                </div>
            ) : null}
        </div>
    );
}
