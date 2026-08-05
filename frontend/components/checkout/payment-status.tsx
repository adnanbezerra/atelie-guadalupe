import Link from "next/link";
import type { Order } from "@/lib/types";
import { formatCurrency } from "@/lib/utils";
import { getDeliveryMessage, getPaymentMessage } from "./checkout-utils";

type PaymentStatusProps = {
    isRefreshing: boolean;
    order: Order;
    paymentConfirmed: boolean;
    paymentProblem: boolean;
    pollingTimedOut: boolean;
    onRefresh: () => void;
};

export function PaymentStatus({
    isRefreshing,
    order,
    paymentConfirmed,
    paymentProblem,
    pollingTimedOut,
    onRefresh,
}: PaymentStatusProps) {
    return (
        <section className="mt-8 grid gap-6 lg:grid-cols-[1fr_22rem]">
            <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm md:p-8">
                <span
                    className={`material-symbols-outlined flex size-14 items-center justify-center rounded-full ${paymentConfirmed ? "bg-emerald-50 text-[#167a45]" : paymentProblem ? "bg-red-50 text-red-700" : "bg-blue-50 text-primary"}`}
                >
                    {paymentConfirmed
                        ? "check_circle"
                        : paymentProblem
                          ? "error"
                          : "hourglass_top"}
                </span>
                <h2 className="mt-5 font-display text-3xl font-bold text-slate-950">
                    {getPaymentMessage(order)}
                </h2>
                <p className="mt-3 max-w-xl leading-7 text-slate-600">
                    {paymentConfirmed
                        ? getDeliveryMessage(order)
                        : paymentProblem
                          ? "Seu pedido continua salvo. O atendimento pode orientar os próximos passos."
                          : pollingTimedOut
                            ? "O pagamento ainda está em processamento. Você pode atualizar sem criar outro pedido."
                            : "Estamos consultando a confirmação enviada pelo meio de pagamento. Esta tela se atualiza automaticamente."}
                </p>
                {!paymentConfirmed && !paymentProblem ? (
                    <div className="mt-7 flex flex-col gap-3 sm:flex-row">
                        <button
                            className="min-h-12 rounded-lg bg-primary px-5 py-3 font-bold text-white focus:outline-none focus:ring-4 focus:ring-primary/30 disabled:opacity-60"
                            disabled={isRefreshing}
                            onClick={onRefresh}
                            type="button"
                        >
                            {isRefreshing
                                ? "Atualizando..."
                                : "Atualizar pagamento"}
                        </button>
                        {order.payment?.checkoutUrl ? (
                            <a
                                className="min-h-12 rounded-lg border border-slate-300 bg-white px-5 py-3 text-center font-bold text-slate-800 focus:outline-none focus:ring-4 focus:ring-primary/20"
                                href={order.payment.checkoutUrl}
                            >
                                Voltar ao pagamento
                            </a>
                        ) : null}
                    </div>
                ) : null}
            </div>
            <OrderReceipt order={order} />
        </section>
    );
}

function OrderReceipt({ order }: { order: Order }) {
    return (
        <aside className="h-fit rounded-xl border border-primary/15 bg-white p-6 shadow-sm">
            <p className="font-public text-xs font-bold uppercase tracking-[0.16em] text-primary">
                Pedido registrado
            </p>
            <p className="mt-2 break-all font-mono text-xs text-slate-500">
                {order.uuid}
            </p>
            <dl className="mt-5 space-y-3 border-t border-dashed border-slate-300 pt-5 text-sm">
                <ReceiptRow
                    label="Produtos"
                    value={formatCurrency(order.subtotalInCents)}
                />
                <ReceiptRow
                    label="Frete"
                    value={formatCurrency(order.shippingInCents)}
                />
                {order.discountInCents > 0 ? (
                    <ReceiptRow
                        label="Descontos"
                        value={formatCurrency(-order.discountInCents)}
                        valueClassName="text-[#167a45]"
                    />
                ) : null}
                <div className="flex justify-between gap-3 border-t border-slate-100 pt-3">
                    <dt className="font-display text-lg font-bold">Total</dt>
                    <dd className="text-xl font-black text-primary">
                        {formatCurrency(order.totalInCents)}
                    </dd>
                </div>
            </dl>
            <Link
                className="mt-6 inline-flex text-sm font-bold text-primary underline-offset-4 hover:underline"
                href="/perfil"
            >
                Ver meus pedidos
            </Link>
        </aside>
    );
}

function ReceiptRow({
    label,
    value,
    valueClassName = "",
}: {
    label: string;
    value: string;
    valueClassName?: string;
}) {
    return (
        <div className="flex justify-between gap-3">
            <dt className="text-slate-500">{label}</dt>
            <dd className={`font-semibold ${valueClassName}`}>{value}</dd>
        </div>
    );
}
