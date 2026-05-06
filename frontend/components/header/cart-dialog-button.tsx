"use client";

import Link from "next/link";
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
} from "@/components/ui/dialog";
import { useApiToken } from "@/hooks/use-api-token";
import { useCart } from "@/hooks/use-cart";
import { formatCurrency } from "@/lib/format";

export function CartDialogButton() {
    const token = useApiToken();
    const cart = useCart();
    const items = cart.data?.items ?? [];
    const itemCount = cart.data?.summary.itemsCount ?? 0;

    return (
        <Dialog>
            <DialogTrigger asChild>
                <button
                    aria-label="Abrir carrinho"
                    className="relative rounded-lg bg-slate-100 p-2"
                    type="button"
                >
                    <span className="material-symbols-outlined text-slate-700">
                        shopping_bag
                    </span>
                    {itemCount > 0 ? (
                        <span className="absolute -right-1 -top-1 flex h-5 min-w-5 items-center justify-center rounded-full bg-primary px-1 text-[10px] font-bold text-white">
                            {itemCount}
                        </span>
                    ) : null}
                </button>
            </DialogTrigger>
            <DialogContent className="!left-auto !right-6 !top-[76px] max-h-[calc(100vh-96px)] w-[calc(100vw-3rem)] max-w-sm !translate-x-0 !translate-y-0 overflow-hidden rounded-xl bg-white p-0 shadow-2xl md:!right-10 lg:!right-[max(2.5rem,calc((100vw-80rem)/2))]">
                <div className="max-h-[calc(100vh-96px)] overflow-y-auto">
                    <DialogHeader className="border-b border-slate-100 p-5">
                        <DialogTitle className="flex items-center gap-2 text-base font-bold text-slate-900">
                            <span className="material-symbols-outlined text-primary">
                                shopping_bag
                            </span>
                            Meu carrinho
                        </DialogTitle>
                        <DialogDescription className="text-sm text-slate-500">
                            {token
                                ? "Itens adicionados ao seu pedido."
                                : "Entre na sua conta para ver e finalizar o carrinho."}
                        </DialogDescription>
                    </DialogHeader>

                    {!token ? (
                        <div className="space-y-3 p-5">
                            <Link
                                className="flex w-full items-center justify-center gap-2 rounded-lg bg-primary px-4 py-3 text-sm font-bold text-white shadow-lg shadow-primary/20 hover:brightness-110"
                                href="/login"
                            >
                                <span className="material-symbols-outlined text-base">
                                    login
                                </span>
                                Fazer login
                            </Link>
                            <Link
                                className="flex w-full items-center justify-center gap-2 rounded-lg border border-slate-200 bg-white px-4 py-3 text-sm font-bold text-slate-900 hover:bg-slate-50"
                                href="/cadastro"
                            >
                                <span className="material-symbols-outlined text-base">
                                    person_add
                                </span>
                                Criar conta
                            </Link>
                        </div>
                    ) : cart.isLoading ? (
                        <div className="space-y-3 p-5">
                            {[0, 1, 2].map((item) => (
                                <div
                                    className="flex animate-pulse gap-3"
                                    key={item}
                                >
                                    <div className="h-14 w-14 rounded-lg bg-slate-100" />
                                    <div className="flex-1 space-y-2">
                                        <div className="h-4 w-3/4 rounded bg-slate-100" />
                                        <div className="h-3 w-1/2 rounded bg-slate-100" />
                                    </div>
                                </div>
                            ))}
                        </div>
                    ) : items.length > 0 ? (
                        <>
                            <div className="divide-y divide-slate-100">
                                {items.map((item) => (
                                    <div
                                        className="flex gap-3 p-5"
                                        key={item.uuid}
                                    >
                                        <img
                                            alt={item.name}
                                            className="h-16 w-16 rounded-lg bg-slate-100 object-cover"
                                            src={item.imageUrl}
                                        />
                                        <div className="min-w-0 flex-1">
                                            <p className="truncate text-sm font-bold text-slate-900">
                                                {item.name}
                                            </p>
                                            <p className="mt-1 text-xs text-slate-500">
                                                {item.grams}g · Quantidade{" "}
                                                {item.quantity}
                                            </p>
                                            <p className="mt-2 text-sm font-bold text-primary">
                                                {formatCurrency(
                                                    item.totalPriceInCents,
                                                )}
                                            </p>
                                        </div>
                                    </div>
                                ))}
                            </div>
                            <div className="sticky bottom-0 border-t border-slate-100 bg-white p-5">
                                <div className="mb-4 flex items-center justify-between text-sm">
                                    <span className="font-medium text-slate-500">
                                        Total
                                    </span>
                                    <span className="font-bold text-slate-900">
                                        {formatCurrency(
                                            cart.data?.summary.totalInCents ??
                                                0,
                                        )}
                                    </span>
                                </div>
                                <Link
                                    className="flex w-full items-center justify-center gap-2 rounded-lg bg-primary px-4 py-3 text-sm font-bold text-white shadow-lg shadow-primary/20 hover:brightness-110"
                                    href="/carrinho"
                                >
                                    Ver carrinho
                                    <span className="material-symbols-outlined text-base">
                                        arrow_forward
                                    </span>
                                </Link>
                            </div>
                        </>
                    ) : (
                        <div className="p-5 text-center">
                            <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-slate-100">
                                <span className="material-symbols-outlined text-slate-500">
                                    shopping_bag
                                </span>
                            </div>
                            <p className="text-sm font-bold text-slate-900">
                                Seu carrinho está vazio.
                            </p>
                            <p className="mt-1 text-xs text-slate-500">
                                Adicione produtos para continuar.
                            </p>
                        </div>
                    )}
                </div>
            </DialogContent>
        </Dialog>
    );
}
