"use client";

import { useMemo } from "react";
import { Card } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { useOrders } from "@/hooks/use-orders";
import { LOW_STOCK_THRESHOLD } from "@/lib/constants";
import { Order, Product } from "@/lib/types";
import { formatCurrency, formatDate } from "@/lib/utils";

type AdminDashboardClientProps = {
    initialOrders: Order[];
    initialProducts: Product[];
};

function monthKey(date: string) {
    const current = new Date(date);
    return `${current.getUTCFullYear()}-${current.getUTCMonth()}`;
}

export function AdminDashboardClient({
    initialOrders,
    initialProducts,
}: AdminDashboardClientProps) {
    const orders = useOrders(initialOrders);

    const metrics = useMemo(() => {
        const currentMonth = monthKey(new Date().toISOString());
        const currentOrders = orders.data.filter(
            (order) => monthKey(order.placedAt) === currentMonth,
        );
        const totalSales = currentOrders.reduce(
            (total, order) => total + order.totalInCents,
            0,
        );
        const averageTicket =
            currentOrders.length > 0 ? totalSales / currentOrders.length : 0;
        const lowStock = initialProducts.filter(
            (product) => product.stock <= LOW_STOCK_THRESHOLD,
        );

        return {
            currentOrders,
            totalSales,
            averageTicket,
            lowStock,
        };
    }, [initialProducts, orders.data]);

    return (
        <div className="space-y-8">
            <div>
                <p className="text-sm uppercase tracking-[0.35em] text-primary/70">
                    Visao Geral
                </p>
                <h2 className="mt-2 font-display text-4xl font-bold text-slate-900">
                    Salve Maria, Administrador
                </h2>
                <p className="mt-3 text-sm text-slate-600">
                    O dashboard combina pedidos reais do backend com alertas de
                    estoque derivados da listagem de produtos.
                </p>
            </div>

            <div className="grid gap-6 md:grid-cols-3">
                {[
                    {
                        label: "Vendas Totais (Mes)",
                        value: formatCurrency(metrics.totalSales),
                    },
                    {
                        label: "Pedidos este Mes",
                        value: `${metrics.currentOrders.length}`,
                    },
                    {
                        label: "Ticket Medio",
                        value: formatCurrency(
                            Math.round(metrics.averageTicket),
                        ),
                    },
                ].map((metric) => (
                    <Card key={metric.label} className="p-6">
                        <p className="text-sm font-medium text-slate-500">
                            {metric.label}
                        </p>
                        {orders.isLoading && !orders.data.length ? (
                            <Skeleton className="mt-4 h-9 w-32" />
                        ) : (
                            <p className="mt-4 text-3xl font-bold text-slate-900">
                                {metric.value}
                            </p>
                        )}
                    </Card>
                ))}
            </div>

            <div className="grid gap-8 lg:grid-cols-[1.7fr_1fr]">
                <Card className="p-6">
                    <div className="flex items-center justify-between gap-4">
                        <div>
                            <h3 className="font-display text-2xl font-bold text-slate-900">
                                Historico de Vendas
                            </h3>
                            <p className="mt-2 text-sm text-slate-500">
                                Leitura simplificada por pedido do mes.
                            </p>
                        </div>
                    </div>
                    <div className="mt-8 flex h-72 items-end gap-3">
                        {(metrics.currentOrders.slice(0, 12).length
                            ? metrics.currentOrders.slice(0, 12)
                            : orders.data.slice(0, 12)
                        ).map((order) => {
                            const max =
                                Math.max(
                                    ...orders.data.map(
                                        (item) => item.totalInCents,
                                    ),
                                    1,
                                ) || 1;
                            const height = `${Math.max(
                                16,
                                Math.round((order.totalInCents / max) * 100),
                            )}%`;

                            return (
                                <div
                                    key={order.uuid}
                                    className="flex flex-1 flex-col items-center gap-3"
                                >
                                    <div
                                        className="w-full rounded-t-2xl bg-primary/70"
                                        style={{ height }}
                                        title={formatCurrency(
                                            order.totalInCents,
                                        )}
                                    />
                                    <span className="text-[10px] font-semibold uppercase tracking-[0.2em] text-slate-500">
                                        {new Date(
                                            order.placedAt,
                                        ).toLocaleDateString("pt-BR", {
                                            day: "2-digit",
                                            month: "2-digit",
                                        })}
                                    </span>
                                </div>
                            );
                        })}
                    </div>
                </Card>

                <Card className="p-6">
                    <h3 className="font-display text-2xl font-bold text-slate-900">
                        Alertas de Estoque
                    </h3>
                    <div className="mt-6 space-y-4">
                        {metrics.lowStock.slice(0, 4).map((product) => (
                            <div
                                key={product.uuid}
                                className="rounded-2xl border border-amber-200 bg-amber-50 p-4"
                            >
                                <p className="font-semibold text-amber-950">
                                    {product.name}
                                </p>
                                <p className="mt-2 text-sm text-amber-800">
                                    Estoque baixo: {product.stock} unidade(s)
                                </p>
                            </div>
                        ))}
                        {!metrics.lowStock.length ? (
                            <p className="text-sm text-slate-500">
                                Nenhum alerta de estoque no limite configurado.
                            </p>
                        ) : null}
                    </div>
                </Card>
            </div>

            <Card className="overflow-hidden">
                <div className="border-b border-slate-200 px-6 py-5">
                    <h3 className="font-display text-2xl font-bold text-slate-900">
                        Pedidos Recentes
                    </h3>
                </div>
                <div className="overflow-x-auto">
                    <table className="min-w-full text-left">
                        <thead className="bg-slate-50 text-xs font-semibold uppercase tracking-[0.22em] text-slate-500">
                            <tr>
                                <th className="px-6 py-4">Pedido</th>
                                <th className="px-6 py-4">Data</th>
                                <th className="px-6 py-4">Status</th>
                                <th className="px-6 py-4">Total</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                            {(orders.data.length ? orders.data : initialOrders)
                                .slice(0, 6)
                                .map((order) => (
                                    <tr key={order.uuid}>
                                        <td className="px-6 py-4 font-semibold text-slate-900">
                                            #{order.uuid.slice(0, 8)}
                                        </td>
                                        <td className="px-6 py-4 text-sm text-slate-600">
                                            {formatDate(order.placedAt)}
                                        </td>
                                        <td className="px-6 py-4">
                                            <span className="rounded-full bg-primary/10 px-3 py-1 text-xs font-semibold uppercase tracking-[0.2em] text-primary">
                                                {order.status}
                                            </span>
                                        </td>
                                        <td className="px-6 py-4 font-semibold text-slate-900">
                                            {formatCurrency(order.totalInCents)}
                                        </td>
                                    </tr>
                                ))}
                            {!orders.data.length && !initialOrders.length ? (
                                <tr>
                                    <td
                                        className="px-6 py-8 text-sm text-slate-500"
                                        colSpan={4}
                                    >
                                        Nenhum pedido retornado pela API.
                                    </td>
                                </tr>
                            ) : null}
                        </tbody>
                    </table>
                </div>
            </Card>
        </div>
    );
}
