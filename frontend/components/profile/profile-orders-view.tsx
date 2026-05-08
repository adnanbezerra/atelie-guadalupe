"use client";

import { formatCurrency } from "@/lib/format";
import type { Order } from "@/lib/types";
import {
    formatAddress,
    formatPaymentMethod,
    orderStatusClasses,
    orderStatusLabels,
    type ProfileOrder,
} from "@/components/profile/profile-page-helpers";

type ProfileOrdersViewProps = {
    orders: Order[];
    error: string | null;
    isLoading: boolean;
};

export function ProfileOrdersView({
    orders,
    error,
    isLoading,
}: ProfileOrdersViewProps) {
    return (
        <div className="space-y-5">
            <div className="rounded-3xl border border-slate-100 bg-white p-8 shadow-sm md:p-12">
                <div className="mb-8 flex flex-col justify-between gap-4 md:flex-row md:items-end">
                    <div>
                        <h2 className="text-2xl font-extrabold tracking-tight text-slate-900">
                            Meus Pedidos
                        </h2>
                        <p className="mt-1 text-slate-500">
                            Acompanhe status, itens e entrega dos pedidos
                            recentes.
                        </p>
                    </div>
                    <span className="w-fit rounded-full bg-slate-50 px-4 py-2 text-xs font-bold uppercase tracking-widest text-slate-500">
                        {orders.length} pedidos
                    </span>
                </div>

                {error ? (
                    <p className="rounded-2xl bg-slate-50 px-5 py-4 text-sm font-semibold text-slate-600">
                        {error}
                    </p>
                ) : null}

                {isLoading ? (
                    <div className="space-y-4">
                        {[0, 1, 2].map((item) => (
                            <div
                                className="h-44 animate-pulse rounded-3xl bg-slate-50"
                                key={item}
                            />
                        ))}
                    </div>
                ) : null}

                {!isLoading && !orders.length ? (
                    <div className="rounded-3xl border border-dashed border-slate-200 bg-slate-50 px-6 py-12 text-center">
                        <span className="material-symbols-outlined text-4xl text-slate-300">
                            shopping_bag
                        </span>
                        <h3 className="mt-4 text-lg font-extrabold text-slate-900">
                            Nenhum pedido recente
                        </h3>
                        <p className="mx-auto mt-2 max-w-md text-sm leading-6 text-slate-500">
                            Quando uma compra for finalizada, ela aparece aqui
                            com status, endereço, pagamento e itens.
                        </p>
                    </div>
                ) : null}

                <div className="space-y-4">
                    {orders.map((order) => (
                        <article
                            className="rounded-3xl border border-slate-100 bg-white p-5 shadow-sm ring-1 ring-slate-50 md:p-6"
                            key={order.uuid}
                        >
                            <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
                                <div>
                                    <p className="text-[11px] font-bold uppercase tracking-widest text-slate-400">
                                        Pedido
                                    </p>
                                    <h3 className="mt-1 text-xl font-extrabold text-slate-900">
                                        #{order.uuid.slice(0, 8)}
                                    </h3>
                                    <p className="mt-1 text-sm text-slate-500">
                                        {new Date(
                                            order.createdAt,
                                        ).toLocaleDateString("pt-BR")}
                                    </p>
                                </div>
                                <div className="flex flex-wrap items-center gap-3">
                                    <span
                                        className={`rounded-full px-4 py-2 text-xs font-bold uppercase tracking-widest ring-1 ${
                                            orderStatusClasses[order.status] ??
                                            "bg-slate-50 text-slate-600 ring-slate-200"
                                        }`}
                                    >
                                        {orderStatusLabels[order.status] ??
                                            order.status}
                                    </span>
                                    <span className="text-lg font-extrabold text-slate-900">
                                        {formatCurrency(order.totalInCents)}
                                    </span>
                                </div>
                            </div>

                            <div className="mt-6 grid gap-4 lg:grid-cols-[1.2fr_0.8fr]">
                                <div className="rounded-2xl bg-slate-50 p-4">
                                    <p className="text-[11px] font-bold uppercase tracking-widest text-slate-400">
                                        Itens pedidos
                                    </p>
                                    <div className="mt-3 space-y-3">
                                        {order.items.map((item) => (
                                            <div
                                                className="flex items-center justify-between gap-4 text-sm"
                                                key={item.uuid}
                                            >
                                                <div>
                                                    <p className="font-bold text-slate-800">
                                                        {
                                                            item.productNameSnapshot
                                                        }
                                                    </p>
                                                    <p className="text-slate-500">
                                                        {item.quantity}x{" "}
                                                        {item.grams}g
                                                    </p>
                                                </div>
                                                <p className="font-bold text-slate-900">
                                                    {formatCurrency(
                                                        item.totalPriceInCents,
                                                    )}
                                                </p>
                                            </div>
                                        ))}
                                    </div>
                                </div>

                                <div className="grid gap-4">
                                    <div className="rounded-2xl bg-slate-50 p-4">
                                        <p className="text-[11px] font-bold uppercase tracking-widest text-slate-400">
                                            Endereço de entrega
                                        </p>
                                        <p className="mt-2 text-sm font-semibold leading-6 text-slate-700">
                                            {formatAddress(order)}
                                        </p>
                                    </div>
                                    <div className="rounded-2xl bg-slate-50 p-4">
                                        <p className="text-[11px] font-bold uppercase tracking-widest text-slate-400">
                                            Método de pagamento
                                        </p>
                                        <p className="mt-2 text-sm font-semibold text-slate-700">
                                            {formatPaymentMethod(
                                                order as ProfileOrder,
                                            )}
                                        </p>
                                    </div>
                                </div>
                            </div>
                        </article>
                    ))}
                </div>
            </div>
        </div>
    );
}
