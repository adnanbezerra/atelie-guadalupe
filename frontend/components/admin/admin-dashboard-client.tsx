"use client";

import { useMemo } from "react";
import { AdminMarketingPanel } from "@/components/admin/admin-marketing-panel";
import { useOrders } from "@/hooks/use-orders";
import { MarketingPayload, Order } from "@/lib/types";
import { formatCurrency, formatDate } from "@/lib/utils";
import { useProfile } from "@/hooks/use-profile";

type AdminDashboardClientProps = {
    initialOrders: Order[];
    initialMarketing: MarketingPayload | null;
};

const orderStatuses: Record<string, { label: string; className: string }> = {
    PENDING: {
        label: "Pendente",
        className: "bg-slate-100 text-slate-700 ring-slate-200",
    },
    AWAITING_PAYMENT: {
        label: "Aguardando pagamento",
        className: "bg-amber-50 text-amber-700 ring-amber-200",
    },
    PAID: {
        label: "Pago",
        className: "bg-emerald-50 text-emerald-700 ring-emerald-200",
    },
    PROCESSING: {
        label: "Em processamento",
        className: "bg-blue-50 text-blue-700 ring-blue-200",
    },
    SHIPPED: {
        label: "Enviado",
        className: "bg-sky-50 text-sky-700 ring-sky-200",
    },
    DELIVERED: {
        label: "Entregue",
        className: "bg-emerald-700 text-white ring-emerald-700",
    },
    CANCELLED: {
        label: "Cancelado",
        className: "bg-red-50 text-red-700 ring-red-200",
    },
};

const unknownOrderStatus = {
    label: "Status indisponível",
    className: "bg-slate-100 text-slate-700 ring-slate-200",
};

const chartDateFormatter = new Intl.DateTimeFormat("pt-BR", {
    day: "2-digit",
    month: "short",
    timeZone: "UTC",
});

function monthKey(date: string) {
    const current = new Date(date);
    return `${current.getUTCFullYear()}-${current.getUTCMonth()}`;
}

function dayKey(date: Date) {
    return date.toISOString().slice(0, 10);
}

export function AdminDashboardClient({
    initialOrders,
    initialMarketing,
}: AdminDashboardClientProps) {
    const orders = useOrders(initialOrders);
    const { user } = useProfile();

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

        return {
            totalSales,
            currentOrders,
            averageTicket,
        };
    }, [orders.data]);

    const salesHistory = useMemo(() => {
        const today = new Date();
        today.setUTCHours(0, 0, 0, 0);
        const days = Array.from({ length: 30 }, (_, index) => {
            const date = new Date(today);
            date.setUTCDate(today.getUTCDate() - (29 - index));

            return {
                date,
                key: dayKey(date),
                totalInCents: 0,
            };
        });
        const totalsByDay = new Map(
            days.map((day) => [day.key, day.totalInCents]),
        );

        for (const order of orders.data) {
            const key = dayKey(new Date(order.placedAt));

            if (totalsByDay.has(key)) {
                totalsByDay.set(
                    key,
                    (totalsByDay.get(key) ?? 0) + order.totalInCents,
                );
            }
        }

        return days.map((day) => ({
            ...day,
            totalInCents: totalsByDay.get(day.key) ?? 0,
        }));
    }, [orders.data]);
    const maxDailySale = Math.max(
        ...salesHistory.map((day) => day.totalInCents),
        1,
    );
    const chartAxisDays = [0, 9, 19, 29].map((index) => salesHistory[index]);

    return (
        <>
            <header className="sticky top-0 z-10 flex items-center justify-between border-b border-slate-200 bg-white/80 px-8 py-4 backdrop-blur-md">
                <h2 className="text-xl font-bold tracking-tight">
                    Visão Geral do Ateliê
                </h2>
                <div className="flex items-center gap-4">
                    <div className="relative">
                        <span className="material-symbols-outlined absolute top-1/2 left-3 -translate-y-1/2 text-slate-400">
                            search
                        </span>
                        <input
                            className="w-64 rounded-lg bg-slate-100 py-2 pr-4 pl-10 text-sm outline-none"
                            placeholder="Procurar pedido..."
                            type="text"
                        />
                    </div>
                </div>
            </header>

            <div className="space-y-8 p-8">
                <div className="flex flex-col gap-1">
                    <h1 className="text-3xl font-bold text-slate-900">
                        Salve Maria,{" "}
                        {user?.name.split(" ")[0] || "Administrador"}!
                    </h1>
                    <p className="text-slate-500">
                        Aqui está o que está acontecendo no ateliê hoje.
                    </p>
                </div>

                <div className="grid grid-cols-1 gap-6 md:grid-cols-3">
                    {[
                        {
                            icon: "payments",
                            iconClass: "bg-primary/10 text-primary",
                            badgeClass: "bg-emerald-50 text-emerald-600",
                            label: "Vendas Totais (Mês)",
                            value: formatCurrency(metrics.totalSales),
                        },
                        {
                            icon: "shopping_bag",
                            iconClass: "bg-amber-100 text-amber-600",
                            badgeClass: "bg-emerald-50 text-emerald-600",
                            label: "Pedidos este Mês",
                            value: `${metrics.currentOrders.length}`,
                        },
                        {
                            icon: "receipt_long",
                            iconClass: "bg-indigo-100 text-indigo-600",
                            badgeClass: "text-slate-400",
                            label: "Ticket Médio",
                            value: formatCurrency(
                                Math.round(metrics.averageTicket),
                            ),
                        },
                    ].map((item) => (
                        <div
                            className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm"
                            key={item.label}
                        >
                            <div className="mb-4 flex items-start justify-between">
                                <div
                                    className={`rounded-lg p-2 ${item.iconClass}`}
                                >
                                    <span className="material-symbols-outlined">
                                        {item.icon}
                                    </span>
                                </div>
                            </div>
                            <p className="text-sm font-medium text-slate-500">
                                {item.label}
                            </p>
                            <p className="mt-1 text-2xl font-bold">
                                {item.value}
                            </p>
                        </div>
                    ))}
                </div>

                <div className="grid grid-cols-1 gap-8 lg:grid-cols-3">
                    <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm lg:col-span-2">
                        <div className="mb-6 flex items-center justify-between">
                            <h3 className="text-lg font-bold">
                                Histórico de Vendas
                            </h3>
                            <select className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-1 text-sm">
                                <option>Últimos 30 dias</option>
                            </select>
                        </div>
                        <div className="flex h-[250px] flex-col justify-end">
                            <div className="grid h-48 grid-cols-[repeat(30,minmax(0,1fr))] items-end gap-1 px-2">
                                {salesHistory.map((day) => (
                                    <div
                                        aria-label={
                                            day.totalInCents > 0
                                                ? `${chartDateFormatter.format(day.date)}: ${formatCurrency(day.totalInCents)}`
                                                : undefined
                                        }
                                        className={
                                            day.totalInCents > 0
                                                ? "w-full rounded-t-sm bg-primary/70 transition-colors hover:bg-primary"
                                                : "h-px w-full bg-slate-200"
                                        }
                                        key={day.key}
                                        style={{
                                            height:
                                                day.totalInCents > 0
                                                    ? `${Math.max(
                                                          8,
                                                          Math.round(
                                                              (day.totalInCents /
                                                                  maxDailySale) *
                                                                  100,
                                                          ),
                                                      )}%`
                                                    : undefined,
                                        }}
                                        title={`${chartDateFormatter.format(day.date)}: ${formatCurrency(day.totalInCents)}`}
                                    />
                                ))}
                            </div>
                            <div className="mt-4 flex justify-between px-1 text-xs font-bold text-slate-500">
                                {chartAxisDays.map((day) => (
                                    <span key={day.key}>
                                        {chartDateFormatter.format(day.date)}
                                    </span>
                                ))}
                            </div>
                        </div>
                    </div>

                    <AdminMarketingPanel initialMarketing={initialMarketing} />
                </div>

                <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
                    <div className="flex items-center justify-between border-b border-slate-200 p-6">
                        <h3 className="text-lg font-bold">Pedidos Recentes</h3>
                        <button className="text-sm font-bold text-primary">
                            Ver todos
                        </button>
                    </div>
                    <div className="overflow-x-auto">
                        <table className="w-full text-left">
                            <thead>
                                <tr className="bg-slate-50 text-xs font-bold uppercase tracking-wider text-slate-500">
                                    <th className="px-6 py-4">ID Pedido</th>
                                    <th className="px-6 py-4">Cliente</th>
                                    <th className="px-6 py-4">Data</th>
                                    <th className="px-6 py-4">Status</th>
                                    <th className="px-6 py-4">Total</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100">
                                {(orders.data.length
                                    ? orders.data
                                    : initialOrders
                                )
                                    .slice(0, 6)
                                    .map((order) => {
                                        const status =
                                            orderStatuses[order.status] ??
                                            unknownOrderStatus;

                                        return (
                                            <tr
                                                className="transition-colors hover:bg-slate-50"
                                                key={order.uuid}
                                            >
                                                <td className="px-6 py-4 text-sm font-bold">
                                                    #{order.uuid.slice(0, 8)}
                                                </td>
                                                <td className="px-6 py-4 text-sm">
                                                    Cliente
                                                </td>
                                                <td className="px-6 py-4 text-sm text-slate-500">
                                                    {formatDate(order.placedAt)}
                                                </td>
                                                <td className="px-6 py-4">
                                                    <span
                                                        className={`inline-flex whitespace-nowrap rounded px-2.5 py-1 text-xs font-bold ring-1 ${status.className}`}
                                                    >
                                                        {status.label}
                                                    </span>
                                                </td>
                                                <td className="px-6 py-4 text-sm font-bold">
                                                    {formatCurrency(
                                                        order.totalInCents,
                                                    )}
                                                </td>
                                            </tr>
                                        );
                                    })}
                            </tbody>
                        </table>
                    </div>
                </div>
            </div>
        </>
    );
}
