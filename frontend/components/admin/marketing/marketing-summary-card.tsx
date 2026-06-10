import { forwardRef, type ComponentPropsWithoutRef } from "react";
import type { PreviewItem } from "./types";

type MarketingSummaryCardProps = ComponentPropsWithoutRef<"button"> & {
    couponsCount: number;
    couponItems: PreviewItem[];
    promotionsCount: number;
    promotionItems: PreviewItem[];
};

export const MarketingSummaryCard = forwardRef<
    HTMLButtonElement,
    MarketingSummaryCardProps
>(function MarketingSummaryCard(
    {
        couponsCount,
        couponItems,
        promotionsCount,
        promotionItems,
        ...buttonProps
    },
    ref,
) {
    return (
        <button
            className="group h-full min-h-[354px] w-full rounded-xl border border-slate-200 bg-white p-0 text-left shadow-sm outline-none transition hover:-translate-y-0.5 hover:border-primary/30 focus-visible:ring-4 focus-visible:ring-primary/20"
            ref={ref}
            type="button"
            {...buttonProps}
        >
            <div className="flex h-full flex-col overflow-hidden rounded-xl">
                <div className="flex items-center justify-between border-b border-slate-200 px-6 py-5">
                    <div>
                        <h3 className="text-lg font-bold text-slate-900">
                            Promoções e Cupons
                        </h3>
                        <p className="mt-1 text-xs font-bold uppercase tracking-[0.14em] text-slate-400">
                            Marketing ativo
                        </p>
                    </div>
                    <span className="material-symbols-outlined rounded-lg bg-primary/10 p-2 text-primary group-hover:bg-primary group-hover:text-white">
                        sell
                    </span>
                </div>

                <div className="grid flex-1 grid-rows-2">
                    <MarketingPreviewList
                        empty="Nenhuma promoção ativa"
                        icon="local_offer"
                        items={promotionItems}
                        label={`${promotionsCount} promoções`}
                    />
                    <MarketingPreviewList
                        empty="Nenhum cupom ativo"
                        icon="confirmation_number"
                        items={couponItems}
                        label={`${couponsCount} cupons`}
                    />
                </div>

                <div className="border-t border-slate-200 bg-slate-50 px-6 py-3 text-sm font-bold text-primary">
                    Abrir gestão de marketing
                </div>
            </div>
        </button>
    );
});

function MarketingPreviewList({
    empty,
    icon,
    items,
    label,
}: {
    empty: string;
    icon: string;
    items: PreviewItem[];
    label: string;
}) {
    return (
        <section className="border-b border-slate-100 px-6 py-4 last:border-b-0">
            <div className="mb-3 flex items-center justify-between">
                <p className="text-xs font-bold uppercase tracking-[0.14em] text-slate-500">
                    {label}
                </p>
                <span className="material-symbols-outlined text-base text-secondary">
                    {icon}
                </span>
            </div>
            <div className="space-y-2">
                {items.length ? (
                    items.map((item) => (
                        <div
                            className="rounded-lg border border-slate-100 bg-slate-50 px-3 py-2"
                            key={item.key}
                        >
                            <p className="truncate text-sm font-bold text-slate-900">
                                {item.title}
                            </p>
                            <p className="truncate text-xs text-slate-500">
                                {item.detail}
                            </p>
                        </div>
                    ))
                ) : (
                    <p className="rounded-lg border border-dashed border-slate-200 bg-white px-3 py-4 text-sm font-semibold text-slate-400">
                        {empty}
                    </p>
                )}
            </div>
        </section>
    );
}
