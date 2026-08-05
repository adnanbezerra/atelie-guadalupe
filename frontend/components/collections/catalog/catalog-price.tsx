import type { Product } from "@/lib/types";
import {
    applyProductDiscount,
    formatCurrency,
    getLowestPriceOption,
    normalizeDiscountPercent,
} from "@/lib/utils";

export function CatalogPrice({ product }: { product: Product }) {
    const lowestPriceOption = getLowestPriceOption(product.priceOptions);
    const originalPriceInCents = lowestPriceOption?.priceInCents ?? 0;
    const discountPercent = normalizeDiscountPercent(
        product.promotionDiscountPercent,
    );
    const finalPriceInCents = applyProductDiscount(
        originalPriceInCents,
        discountPercent,
    );

    if (originalPriceInCents <= 0) return <span>Sob consulta</span>;

    return (
        <span className="flex flex-col leading-tight">
            <span className="mb-1 text-xs font-semibold text-slate-500">
                A partir de
            </span>
            <span className="text-red">
                {formatCurrency(finalPriceInCents)}
            </span>
            {discountPercent > 0 ? (
                <span className="mt-1 flex items-center gap-2 text-xs font-semibold">
                    <span className="text-neutral-400 line-through">
                        {formatCurrency(originalPriceInCents)}
                    </span>
                    <span className="rounded bg-emerald-50 px-1.5 py-0.5 text-[10px] font-bold text-emerald-700">
                        {discountPercent}% OFF
                    </span>
                </span>
            ) : null}
        </span>
    );
}
