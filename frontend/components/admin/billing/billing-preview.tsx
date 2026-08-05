import { formatCurrency } from "@/lib/utils";
import { formatDateTime } from "./utils";

type BillingPreviewProps = {
    amountInCents: number;
    description: string;
    expiresAt: string;
};

export function BillingPreview({
    amountInCents,
    description,
    expiresAt,
}: BillingPreviewProps) {
    return (
        <aside className="h-fit overflow-hidden rounded-xl border border-[#d1a054]/35 bg-[#f8f5ef] shadow-sm lg:sticky lg:top-6">
            <div className="border-b border-dashed border-[#d1a054]/40 px-6 py-5">
                <p className="font-public text-[0.68rem] font-bold uppercase tracking-[0.18em] text-[#4A3728]">
                    Nota de cobrança
                </p>
                <p className="mt-1 text-xs text-slate-500">
                    Prévia antes de emitir
                </p>
            </div>
            <div className="px-6 py-7">
                <p className="text-sm font-semibold leading-6 text-slate-800">
                    {description}
                </p>
                <p className="mt-7 font-display text-4xl font-bold tracking-tight text-primary">
                    {amountInCents > 0
                        ? formatCurrency(amountInCents)
                        : "R$ 0,00"}
                </p>
                <dl className="mt-7 space-y-3 border-t border-dashed border-[#d1a054]/40 pt-5 text-sm">
                    <div className="flex justify-between gap-4">
                        <dt className="text-slate-500">Validade</dt>
                        <dd className="text-right font-semibold text-slate-800">
                            {expiresAt
                                ? formatDateTime(
                                      new Date(expiresAt).toISOString(),
                                  )
                                : "Sem expiração"}
                        </dd>
                    </div>
                    <div className="flex justify-between gap-4">
                        <dt className="text-slate-500">Situação inicial</dt>
                        <dd className="font-semibold text-amber-800">
                            Não pago
                        </dd>
                    </div>
                </dl>
            </div>
        </aside>
    );
}
