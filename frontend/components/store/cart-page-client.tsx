"use client";

import { useState } from "react";
import { EmptyState } from "@/components/shared/empty-state";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { useCart } from "@/hooks/use-cart";
import { formatCurrency } from "@/lib/format";
import type { Address, Cart } from "@/lib/types";

export function CartPageClient({
    initialCart,
    addresses,
}: {
    initialCart: Cart | null;
    addresses: Address[];
}) {
    const cart = useCart(initialCart);
    const [selectedAddress, setSelectedAddress] = useState(
        addresses[0]?.uuid ?? "",
    );
    const [notes, setNotes] = useState("");
    const [feedback, setFeedback] = useState<string | null>(null);

    if (!cart.data) {
        return (
            <section className="mx-auto max-w-7xl px-4 pt-10 sm:px-6 lg:px-8">
                <EmptyState
                    title="Carrinho indisponível"
                    description="O backend exige autenticação para `/cart`. Assim que houver um JWT em cookie, esta tela carrega o carrinho e habilita checkout completo."
                />
            </section>
        );
    }

    return (
        <section className="mx-auto max-w-7xl px-4 pt-10 sm:px-6 lg:px-8">
            <div className="grid gap-8 lg:grid-cols-[1.3fr_0.7fr]">
                <div className="space-y-5">
                    {cart.data.items.map((item) => (
                        <Card
                            key={item.uuid}
                            className="grid gap-5 p-5 md:grid-cols-[140px_1fr_auto] md:items-center"
                        >
                            <img
                                alt={item.name}
                                className="aspect-square rounded-2xl object-cover"
                                src={item.imageUrl}
                            />
                            <div>
                                <div className="flex flex-wrap items-center gap-2">
                                    <h2 className="font-display text-2xl font-bold">
                                        {item.name}
                                    </h2>
                                    {!item.isAvailable ? (
                                        <Badge tone="danger">
                                            indisponível
                                        </Badge>
                                    ) : null}
                                </div>
                                <p className="mt-2 text-sm text-muted-foreground">
                                    {item.grams}g ·{" "}
                                    {formatCurrency(item.unitPriceInCents)} por
                                    unidade
                                </p>
                                <div className="mt-4 flex items-center gap-3">
                                    <Button
                                        variant="outline"
                                        onClick={() =>
                                            void cart.updateItem(
                                                item.uuid,
                                                Math.max(1, item.quantity - 1),
                                            )
                                        }
                                    >
                                        -
                                    </Button>
                                    <span className="min-w-8 text-center text-sm font-semibold">
                                        {item.quantity}
                                    </span>
                                    <Button
                                        variant="outline"
                                        onClick={() =>
                                            void cart.updateItem(
                                                item.uuid,
                                                item.quantity + 1,
                                            )
                                        }
                                    >
                                        +
                                    </Button>
                                </div>
                            </div>
                            <div className="flex flex-col items-end gap-3">
                                <p className="text-lg font-bold text-primary">
                                    {formatCurrency(item.totalPriceInCents)}
                                </p>
                                <Button
                                    variant="ghost"
                                    onClick={() =>
                                        void cart.removeItem(item.uuid)
                                    }
                                >
                                    Remover
                                </Button>
                            </div>
                        </Card>
                    ))}
                </div>

                <Card className="h-fit p-6">
                    <Badge>Resumo</Badge>
                    <div className="mt-6 space-y-4 text-sm">
                        <div className="flex items-center justify-between">
                            <span>Itens</span>
                            <span>{cart.data.summary.itemsCount}</span>
                        </div>
                        <div className="flex items-center justify-between">
                            <span>Subtotal</span>
                            <span>
                                {formatCurrency(
                                    cart.data.summary.subtotalInCents,
                                )}
                            </span>
                        </div>
                    </div>
                    <div className="mt-6 space-y-3">
                        <label className="block text-sm font-semibold">
                            Endereço
                        </label>
                        <select
                            className="h-11 w-full rounded-xl border border-border bg-white/80 px-3 text-sm"
                            onChange={(event) =>
                                setSelectedAddress(event.target.value)
                            }
                            value={selectedAddress}
                        >
                            <option value="">Sem endereço</option>
                            {addresses.map((address) => (
                                <option key={address.uuid} value={address.uuid}>
                                    {address.label ?? address.recipient} ·{" "}
                                    {address.city}/{address.state}
                                </option>
                            ))}
                        </select>
                        <label className="block text-sm font-semibold">
                            Observações
                        </label>
                        <Input
                            placeholder="Entregar em horário comercial"
                            value={notes}
                            onChange={(event) => setNotes(event.target.value)}
                        />
                    </div>
                    <Button
                        className="mt-6 w-full"
                        onClick={async () => {
                            try {
                                const order = await cart.checkout(
                                    selectedAddress || undefined,
                                    notes || undefined,
                                );
                                setFeedback(
                                    `Pedido ${order.uuid} criado com status ${order.status}.`,
                                );
                                await cart.refresh();
                            } catch (error) {
                                setFeedback(
                                    error instanceof Error
                                        ? error.message
                                        : "Falha ao finalizar pedido.",
                                );
                            }
                        }}
                    >
                        Finalizar Compra
                    </Button>
                    <Button
                        className="mt-3 w-full"
                        onClick={() => void cart.clearCart()}
                        variant="outline"
                    >
                        Limpar Carrinho
                    </Button>
                    {feedback ? (
                        <p className="mt-4 text-sm text-muted-foreground">
                            {feedback}
                        </p>
                    ) : null}
                </Card>
            </div>
        </section>
    );
}
