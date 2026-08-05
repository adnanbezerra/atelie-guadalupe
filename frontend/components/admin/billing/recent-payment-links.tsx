import { Skeleton } from "@/components/ui/skeleton";
import type { PaymentLink } from "@/lib/types";
import { formatCurrency } from "@/lib/utils";
import { formatDateTime, statusDetails } from "./utils";

type RecentPaymentLinksProps = {
    isLoading: boolean;
    onRefresh: () => void;
    paymentLinks: PaymentLink[];
};

export function RecentPaymentLinks({
    isLoading,
    onRefresh,
    paymentLinks,
}: RecentPaymentLinksProps) {
    return (
        <section className="mt-8 overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
            <div className="flex flex-col gap-3 border-b border-slate-200 px-5 py-5 sm:flex-row sm:items-center sm:justify-between md:px-7">
                <div>
                    <h2 className="text-xl font-bold text-slate-950">
                        Cobranças recentes
                    </h2>
                    <p className="mt-1 text-sm text-slate-500">
                        Somente links de pagamento personalizados, do mais
                        recente para o mais antigo.
                    </p>
                </div>
                <button
                    className="inline-flex min-h-10 items-center justify-center gap-2 self-start rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm font-bold text-slate-700 transition hover:bg-slate-50 focus:outline-none focus:ring-4 focus:ring-primary/15 disabled:opacity-60"
                    disabled={isLoading}
                    onClick={onRefresh}
                    type="button"
                >
                    <span className="material-symbols-outlined text-lg">
                        refresh
                    </span>
                    Atualizar
                </button>
            </div>

            {isLoading ? (
                <div
                    className="space-y-3 p-5 md:p-7"
                    aria-label="Carregando cobranças"
                >
                    {[0, 1, 2].map((item) => (
                        <Skeleton
                            className="h-16 w-full rounded-lg"
                            key={item}
                        />
                    ))}
                </div>
            ) : paymentLinks.length ? (
                <div className="overflow-x-auto">
                    <table className="w-full min-w-[780px] text-left text-sm">
                        <thead className="bg-slate-50 font-public text-[0.68rem] font-bold uppercase tracking-[0.12em] text-slate-500">
                            <tr>
                                <th className="px-6 py-3">Cobrança</th>
                                <th className="px-6 py-3">Criada por</th>
                                <th className="px-6 py-3">Valor</th>
                                <th className="px-6 py-3">Status</th>
                                <th className="px-6 py-3">Data</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                            {paymentLinks.map((paymentLink) => (
                                <PaymentLinkRow
                                    key={paymentLink.uuid}
                                    paymentLink={paymentLink}
                                />
                            ))}
                        </tbody>
                    </table>
                </div>
            ) : (
                <div className="px-6 py-12 text-center">
                    <span className="material-symbols-outlined text-4xl text-slate-300">
                        receipt_long
                    </span>
                    <h3 className="mt-3 font-bold text-slate-900">
                        Nenhuma cobrança personalizada
                    </h3>
                    <p className="mt-1 text-sm text-slate-500">
                        O primeiro link gerado aparecerá aqui.
                    </p>
                </div>
            )}
        </section>
    );
}

function PaymentLinkRow({ paymentLink }: { paymentLink: PaymentLink }) {
    const status = statusDetails[paymentLink.status];

    return (
        <tr className="text-slate-700">
            <td className="max-w-sm px-6 py-4">
                <p
                    className="truncate font-bold text-slate-950"
                    title={paymentLink.description}
                >
                    {paymentLink.description}
                </p>
                <p className="mt-1 font-mono text-[0.68rem] text-slate-400">
                    {paymentLink.uuid.slice(0, 8)}
                </p>
            </td>
            <td className="px-6 py-4">
                <p className="font-semibold text-slate-800">
                    {paymentLink.createdBy.name}
                </p>
                <p className="mt-1 text-xs text-slate-500">
                    {paymentLink.createdBy.email}
                </p>
            </td>
            <td className="px-6 py-4 font-bold text-slate-950">
                {formatCurrency(paymentLink.amountInCents)}
            </td>
            <td className="px-6 py-4">
                <span
                    className={`inline-flex rounded-full px-2.5 py-1 text-xs font-bold ring-1 ring-inset ${status.tone}`}
                >
                    {status.label}
                </span>
                <p className="mt-1.5 text-xs text-slate-500">{status.detail}</p>
            </td>
            <td className="whitespace-nowrap px-6 py-4 text-slate-600">
                {formatDateTime(paymentLink.createdAt)}
                {paymentLink.paidAt ? (
                    <p className="mt-1 text-xs font-semibold text-emerald-700">
                        Pago em {formatDateTime(paymentLink.paidAt)}
                    </p>
                ) : null}
            </td>
        </tr>
    );
}
