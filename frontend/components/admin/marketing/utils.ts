import type {
    MarketingCoupon,
    MarketingPromotion,
    ProductCategory,
} from "@/lib/types";

const categoryLabels: Record<ProductCategory, string> = {
    ARTISANAL: "Artesanal",
    SELFCARE: "Selfcare",
};

const now = () => new Date();

export const inputClass =
    "w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm font-semibold text-slate-800 outline-none focus:border-primary focus:ring-4 focus:ring-primary/10";

export function isActiveWindow(startsAt: string, endsAt: string | null) {
    const current = now();
    return (
        new Date(startsAt) <= current &&
        (!endsAt || new Date(endsAt) >= current)
    );
}

export function isActiveCoupon(coupon: MarketingCoupon) {
    return (
        coupon.isActive &&
        !coupon.cancelledAt &&
        (!coupon.validUntil || new Date(coupon.validUntil) >= now())
    );
}

export function toDatetimeLocal(value: string | null) {
    if (!value) return "";

    const date = new Date(value);
    const offset = date.getTimezoneOffset();
    const local = new Date(date.getTime() - offset * 60 * 1000);

    return local.toISOString().slice(0, 16);
}

export function fromDatetimeLocal(value: string) {
    return value ? new Date(value).toISOString() : null;
}

export function percentLabel(value: number) {
    return `${value}%`;
}

export function promotionScopeLabel(promotion: MarketingPromotion) {
    if (promotion.scope === "CATEGORY" && promotion.category) {
        return categoryLabels[promotion.category] ?? promotion.category;
    }

    return "Todos os produtos";
}

export function activeLabel(isActive: boolean) {
    return isActive ? "Ativo" : "Inativo";
}
