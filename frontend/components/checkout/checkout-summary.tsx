import { formatCurrency } from "@/lib/utils";

type CheckoutSummaryProps = {
    canPrepare: boolean;
    discount: number;
    isPreparing: boolean;
    isRedirecting: boolean;
    isShippingConfirmed: boolean;
    onOpenPayment: () => void;
    onPrepareOrder: () => void;
    serviceName: string;
    shipping: number;
    subtotal: number;
    total: number;
};

export function CheckoutSummary({
    canPrepare,
    discount,
    isPreparing,
    isRedirecting,
    isShippingConfirmed,
    onOpenPayment,
    onPrepareOrder,
    serviceName,
    shipping,
    subtotal,
    total,
}: CheckoutSummaryProps) {
    return (
        <aside
            aria-label="Resumo do pedido"
            className="h-fit overflow-hidden rounded-xl bg-white shadow-lg lg:sticky lg:top-24"
        >
            <div className="border-b border-slate-100 px-6 py-5">
                <h2 className="font-display text-2xl font-bold text-slate-950">
                    Resumo final
                </h2>
            </div>
            <div className="space-y-4 px-6 py-5 text-sm">
                <SummaryRow label="Produtos" value={formatCurrency(subtotal)} />
                {discount > 0 ? (
                    <SummaryRow
                        label="Descontos"
                        value={formatCurrency(-discount)}
                        valueClassName="text-[#167a45]"
                    />
                ) : null}
                <SummaryRow
                    label={serviceName}
                    value={
                        shipping > 0 ? formatCurrency(shipping) : "A confirmar"
                    }
                />
                <div className="border-t border-dashed border-slate-300 pt-4">
                    <div className="flex items-end justify-between gap-4">
                        <span className="font-display text-lg font-bold text-slate-950">
                            Total
                        </span>
                        <span className="text-2xl font-black text-primary">
                            {formatCurrency(total)}
                        </span>
                    </div>
                    <p
                        className={`mt-2 text-xs leading-5 ${isShippingConfirmed ? "font-bold text-[#167a45]" : "text-slate-500"}`}
                    >
                        {isShippingConfirmed
                            ? "Frete e total confirmados pelo ateliê."
                            : "Confirmamos o frete antes de abrir o pagamento. Se o valor mudar, você verá aqui primeiro."}
                    </p>
                </div>
            </div>
            <div className="bg-[#f8f5ef] p-5">
                {isShippingConfirmed ? (
                    <SummaryButton
                        disabled={isRedirecting}
                        icon="lock"
                        label={
                            isRedirecting
                                ? "Abrindo pagamento..."
                                : "Ir para pagamento seguro"
                        }
                        onClick={onOpenPayment}
                    />
                ) : (
                    <SummaryButton
                        disabled={isPreparing || !canPrepare}
                        icon="arrow_forward"
                        label={
                            isPreparing
                                ? "Confirmando pedido..."
                                : "Confirmar pedido e frete"
                        }
                        onClick={onPrepareOrder}
                    />
                )}
                <p className="mt-3 text-center text-xs leading-5 text-slate-500">
                    Não cobramos nada sem mostrar o valor final.
                </p>
            </div>
        </aside>
    );
}

function SummaryRow({
    label,
    value,
    valueClassName = "",
}: {
    label: string;
    value: string;
    valueClassName?: string;
}) {
    return (
        <div className="flex justify-between gap-4">
            <span className="text-slate-500">{label}</span>
            <span className={`text-right font-semibold ${valueClassName}`}>
                {value}
            </span>
        </div>
    );
}

function SummaryButton({
    disabled,
    icon,
    label,
    onClick,
}: {
    disabled: boolean;
    icon: string;
    label: string;
    onClick: () => void;
}) {
    return (
        <button
            aria-busy={disabled && label.endsWith("...")}
            className="flex min-h-14 w-full items-center justify-center gap-2 rounded-lg bg-primary px-5 py-4 font-bold text-white shadow-md shadow-primary/20 focus:outline-none focus:ring-4 focus:ring-primary/30 disabled:opacity-60"
            disabled={disabled}
            onClick={onClick}
            type="button"
        >
            {label}
            <span
                aria-hidden="true"
                className="material-symbols-outlined text-xl"
            >
                {icon}
            </span>
        </button>
    );
}
