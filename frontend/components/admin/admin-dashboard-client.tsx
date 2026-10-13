"use client";

import Link from "next/link";
import { useState } from "react";
import { AdminMarketingPanel } from "@/components/admin/admin-marketing-panel";
import { FeedbackDialog } from "@/components/shared/feedback-dialog";
import { useProfile } from "@/hooks/use-profile";
import type { AdminDashboardPayload, MarketingPayload } from "@/lib/types";
import { formatCurrency, formatDate } from "@/lib/utils";

type Props = {
    dashboard: AdminDashboardPayload | null;
    initialError: string | null;
    initialMarketing: MarketingPayload | null;
};

const metricCards = [
    ["payments", "Receita paga", "paidRevenueInCents", "currency"],
    ["shopping_bag", "Pedidos pagos", "paidOrders", "number"],
    ["receipt_long", "Ticket médio", "averagePaidTicketInCents", "currency"],
    ["schedule", "Aguardando pagamento", "awaitingPaymentOrders", "number"],
    ["inventory_2", "Pedidos para preparar", "ordersToPrepare", "number"],
    ["local_shipping", "Pedidos para enviar", "ordersToShip", "number"],
] as const;

function ClockIcon() {
    return (
        <svg
            aria-hidden="true"
            className="size-6 text-primary"
            fill="none"
            viewBox="0 0 24 24"
        >
            <circle
                cx="12"
                cy="12"
                r="9"
                stroke="currentColor"
                strokeWidth="2"
            />
            <path
                d="M12 7v5l3 2"
                stroke="currentColor"
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth="2"
            />
        </svg>
    );
}

function queueLabel(item: AdminDashboardPayload["priorityOrders"][number]) {
    if (item.fulfillmentStatus === "FAILED") return "Corrigir fulfillment";
    if (item.status === "PAID") return "Preparar pedido";
    if (item.status === "PROCESSING") return "Providenciar envio";
    return "Acompanhar pagamento";
}

export function AdminDashboardClient({
    dashboard,
    initialError,
    initialMarketing,
}: Props) {
    const { user } = useProfile();
    const [errorDismissed, setErrorDismissed] = useState(false);
    const metrics = dashboard?.metrics;

    return (
        <>
            <header className="sticky top-0 z-10 flex items-center justify-between border-b border-slate-200 bg-white/90 px-4 py-4 backdrop-blur-md md:px-8">
                <h2 className="text-xl font-bold tracking-tight">
                    Visão Geral do Ateliê
                </h2>
                <Link
                    className="rounded-lg border border-slate-200 bg-white px-4 py-2 text-sm font-bold text-slate-700 hover:bg-slate-50"
                    href="/admin/produtos"
                >
                    Gerenciar produtos
                </Link>
            </header>

            <div className="space-y-8 p-4 md:p-8">
                <div>
                    <h1 className="text-3xl font-bold text-slate-900">
                        Salve Maria,{" "}
                        {user?.name.split(" ")[0] || "Administrador"}!
                    </h1>
                    <p className="mt-1 text-slate-600">
                        {dashboard
                            ? `Dados de ${formatDate(dashboard.period.from)} a ${formatDate(dashboard.period.to)}.`
                            : "Os dados operacionais não estão disponíveis agora."}
                    </p>
                </div>

                <section
                    aria-label="Indicadores do período"
                    className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3"
                >
                    {metricCards.map(([icon, label, key, format]) => {
                        const value = metrics?.[key];
                        return (
                            <div
                                className="rounded-xl border border-slate-200 bg-white p-5"
                                key={key}
                            >
                                {icon === "schedule" ? (
                                    <ClockIcon />
                                ) : (
                                    <span
                                        aria-hidden="true"
                                        className="material-symbols-outlined text-2xl text-primary"
                                    >
                                        {icon}
                                    </span>
                                )}
                                <p className="mt-4 text-sm font-medium text-slate-600">
                                    {label}
                                </p>
                                <p className="mt-1 text-2xl font-extrabold text-slate-950">
                                    {value == null
                                        ? "Indisponível"
                                        : format === "currency"
                                          ? formatCurrency(value)
                                          : value}
                                </p>
                            </div>
                        );
                    })}
                </section>

                <div className="grid items-start gap-8 lg:grid-cols-[minmax(0,2fr)_minmax(18rem,1fr)]">
                    <section className="overflow-hidden rounded-xl border border-slate-200 bg-white">
                        <div className="border-b border-slate-200 p-6">
                            <h3 className="text-lg font-bold">
                                Fila operacional
                            </h3>
                            <p className="mt-1 text-sm text-slate-600">
                                Até dez pedidos ordenados pela urgência
                                calculada no backend.
                            </p>
                        </div>
                        <div className="overflow-x-auto">
                            <table className="w-full min-w-[640px] text-left">
                                <thead className="bg-slate-50 text-xs font-bold uppercase tracking-wider text-slate-600">
                                    <tr>
                                        <th className="px-6 py-4">Pedido</th>
                                        <th className="px-6 py-4">Data</th>
                                        <th className="px-6 py-4">
                                            Próxima ação
                                        </th>
                                        <th className="px-6 py-4 text-right">
                                            Total
                                        </th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-100">
                                    {(dashboard?.priorityOrders ?? []).map(
                                        (item) => (
                                            <tr key={item.uuid}>
                                                <td className="px-6 py-4 font-bold">
                                                    <Link
                                                        className="text-primary hover:underline"
                                                        href={`/perfil/pedidos/${item.uuid}`}
                                                    >
                                                        #{item.uuid.slice(0, 8)}
                                                    </Link>
                                                </td>
                                                <td className="px-6 py-4 text-sm text-slate-600">
                                                    {formatDate(item.placedAt)}
                                                </td>
                                                <td className="px-6 py-4 text-sm font-semibold text-slate-800">
                                                    {queueLabel(item)}
                                                </td>
                                                <td className="px-6 py-4 text-right font-bold">
                                                    {formatCurrency(
                                                        item.totalInCents,
                                                    )}
                                                </td>
                                            </tr>
                                        ),
                                    )}
                                </tbody>
                            </table>
                        </div>
                        {dashboard && dashboard.priorityOrders.length === 0 ? (
                            <p className="px-6 py-10 text-center text-sm text-slate-600">
                                Nenhum pedido exige ação no período.
                            </p>
                        ) : null}
                    </section>
                    <AdminMarketingPanel initialMarketing={initialMarketing} />
                </div>
            </div>

            <FeedbackDialog
                confirmLabel="Recarregar painel"
                description={initialError ?? ""}
                onConfirm={() => window.location.reload()}
                onOpenChange={(open) => setErrorDismissed(!open)}
                open={Boolean(initialError) && !errorDismissed}
                title="Painel indisponível"
            />
        </>
    );
}
