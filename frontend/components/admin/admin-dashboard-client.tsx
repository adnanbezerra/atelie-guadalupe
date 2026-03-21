"use client";

import Link from "next/link";
import { useMemo } from "react";
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

        return {
            totalSales,
            currentOrders,
            averageTicket,
            lowStock: initialProducts
                .filter((product) => product.stock <= LOW_STOCK_THRESHOLD)
                .slice(0, 3),
        };
    }, [initialProducts, orders.data]);

    const chartOrders = (metrics.currentOrders.length
        ? metrics.currentOrders
        : orders.data
    ).slice(0, 12);
    const maxOrder = Math.max(...chartOrders.map((item) => item.totalInCents), 1);

    return (
        <div className="min-h-screen bg-[#f6f6f8] text-slate-900">
            <div className="flex h-screen overflow-hidden">
                <aside className="hidden w-64 flex-col border-r border-slate-200 bg-white lg:flex">
                    <div className="p-6">
                        <div className="flex items-center gap-3">
                            <div className="rounded-full bg-primary/10 p-2">
                                <span className="material-symbols-outlined text-primary">
                                    auto_awesome
                                </span>
                            </div>
                            <div>
                                <h1 className="text-lg font-bold leading-tight text-primary">
                                    Ateliê Guadalupe
                                </h1>
                                <p className="text-xs font-medium uppercase tracking-wider text-slate-500">
                                    Administração
                                </p>
                            </div>
                        </div>
                    </div>
                    <nav className="flex-1 space-y-1 px-4">
                        <Link className="flex items-center gap-3 rounded-lg bg-primary px-3 py-2.5 text-white" href="/admin">
                            <span className="material-symbols-outlined">dashboard</span>
                            <span className="text-sm font-medium">Painel</span>
                        </Link>
                        <Link className="flex items-center gap-3 rounded-lg px-3 py-2.5 text-slate-600" href="/admin/produtos">
                            <span className="material-symbols-outlined">inventory_2</span>
                            <span className="text-sm font-medium">Produtos</span>
                        </Link>
                        <Link className="flex items-center gap-3 rounded-lg px-3 py-2.5 text-slate-600" href="/admin/cobranca">
                            <span className="material-symbols-outlined">shopping_cart</span>
                            <span className="text-sm font-medium">Vendas/Links</span>
                        </Link>
                        <Link className="flex items-center gap-3 rounded-lg px-3 py-2.5 text-slate-600" href="/admin/usuarios">
                            <span className="material-symbols-outlined">group</span>
                            <span className="text-sm font-medium">Usuários</span>
                        </Link>
                    </nav>
                    <div className="border-t border-slate-200 p-4">
                        <button className="flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-red-600">
                            <span className="material-symbols-outlined">logout</span>
                            <span className="text-sm font-medium">Sair</span>
                        </button>
                    </div>
                </aside>

                <main className="flex-1 overflow-y-auto">
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
                            <button className="relative rounded-lg p-2 text-slate-500">
                                <span className="material-symbols-outlined">
                                    notifications
                                </span>
                                <span className="absolute top-2 right-2 h-2 w-2 rounded-full bg-red-500" />
                            </button>
                        </div>
                    </header>

                    <div className="space-y-8 p-8">
                        <div className="flex flex-col gap-1">
                            <h1 className="text-3xl font-bold text-slate-900">
                                Salve Maria, Administrador
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
                                    badge: "+12.5%",
                                    badgeClass: "bg-emerald-50 text-emerald-600",
                                    label: "Vendas Totais (Mês)",
                                    value: formatCurrency(metrics.totalSales),
                                },
                                {
                                    icon: "shopping_bag",
                                    iconClass: "bg-amber-100 text-amber-600",
                                    badge: "+5.2%",
                                    badgeClass: "bg-emerald-50 text-emerald-600",
                                    label: "Pedidos este Mês",
                                    value: `${metrics.currentOrders.length}`,
                                },
                                {
                                    icon: "receipt_long",
                                    iconClass: "bg-indigo-100 text-indigo-600",
                                    badge: "Estável",
                                    badgeClass: "text-slate-400",
                                    label: "Ticket Médio",
                                    value: formatCurrency(Math.round(metrics.averageTicket)),
                                },
                            ].map((item) => (
                                <div
                                    className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm"
                                    key={item.label}
                                >
                                    <div className="mb-4 flex items-start justify-between">
                                        <div className={`rounded-lg p-2 ${item.iconClass}`}>
                                            <span className="material-symbols-outlined">
                                                {item.icon}
                                            </span>
                                        </div>
                                        <span
                                            className={`rounded-full px-2 py-1 text-xs font-bold ${item.badgeClass}`}
                                        >
                                            {item.badge}
                                        </span>
                                    </div>
                                    <p className="text-sm font-medium text-slate-500">
                                        {item.label}
                                    </p>
                                    <p className="mt-1 text-2xl font-bold">{item.value}</p>
                                </div>
                            ))}
                        </div>

                        <div className="grid grid-cols-1 gap-8 lg:grid-cols-3">
                            <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm lg:col-span-2">
                                <div className="mb-6 flex items-center justify-between">
                                    <h3 className="text-lg font-bold">Histórico de Vendas</h3>
                                    <select className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-1 text-sm">
                                        <option>Últimos 30 dias</option>
                                    </select>
                                </div>
                                <div className="flex h-[250px] flex-col justify-end">
                                    <div className="flex h-48 items-end justify-between gap-2 px-2">
                                        {chartOrders.map((order) => (
                                            <div
                                                className="w-full rounded-t-sm bg-primary/20 hover:bg-primary"
                                                key={order.uuid}
                                                style={{
                                                    height: `${Math.max(
                                                        30,
                                                        Math.round(
                                                            (order.totalInCents / maxOrder) * 100,
                                                        ),
                                                    )}%`,
                                                }}
                                                title={formatCurrency(order.totalInCents)}
                                            />
                                        ))}
                                    </div>
                                    <div className="mt-4 flex justify-between px-1 text-[10px] font-bold uppercase tracking-widest text-slate-400">
                                        <span>01 Mai</span>
                                        <span>10 Mai</span>
                                        <span>20 Mai</span>
                                        <span>30 Mai</span>
                                    </div>
                                </div>
                            </div>

                            <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
                                <h3 className="mb-6 text-lg font-bold">Alertas de Estoque</h3>
                                <div className="space-y-4">
                                    {metrics.lowStock.map((product, index) => (
                                        <div
                                            className={`flex items-center gap-4 rounded-lg border p-3 ${
                                                index === 0
                                                    ? "border-red-100 bg-red-50"
                                                    : "border-amber-100 bg-amber-50"
                                            }`}
                                            key={product.uuid}
                                        >
                                            <span
                                                className={`material-symbols-outlined ${
                                                    index === 0
                                                        ? "text-red-600"
                                                        : "text-amber-600"
                                                }`}
                                            >
                                                {index === 0 ? "error" : "warning"}
                                            </span>
                                            <div className="flex-1">
                                                <p className="text-sm font-bold text-slate-900">
                                                    {product.name}
                                                </p>
                                                <p className="text-xs text-slate-600">
                                                    Estoque baixo: {product.stock} unidades
                                                </p>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                                <button className="mt-6 w-full rounded-lg border border-primary/20 py-2 text-sm font-bold text-primary">
                                    Ver Estoque Completo
                                </button>
                            </div>
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
                                        {(orders.data.length ? orders.data : initialOrders)
                                            .slice(0, 6)
                                            .map((order) => (
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
                                                        <span className="rounded bg-blue-100 px-2 py-1 text-[10px] font-bold uppercase text-blue-700">
                                                            {order.status}
                                                        </span>
                                                    </td>
                                                    <td className="px-6 py-4 text-sm font-bold">
                                                        {formatCurrency(order.totalInCents)}
                                                    </td>
                                                </tr>
                                            ))}
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    </div>
                </main>
            </div>
        </div>
    );
}
