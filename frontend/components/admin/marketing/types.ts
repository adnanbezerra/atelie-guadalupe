import type { MarketingCoupon, MarketingPromotion } from "@/lib/types";

export type MarketingTab = "promotions" | "coupons";

export type MarketingEditor =
    | { kind: "promotion"; item?: MarketingPromotion }
    | { kind: "coupon"; item?: MarketingCoupon };

export type PreviewItem = {
    key: string;
    title: string;
    detail: string;
};
