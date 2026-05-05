import { ProductCategory } from "../../../generated/prisma/enums";

export type ActivePromotion = {
    discountPercent: number;
    scope: "ALL_PRODUCTS" | "CATEGORY";
    category: ProductCategory | null;
};

export function calculatePercentDiscountInCents(baseInCents: number, discountPercent: number) {
    return Math.floor((baseInCents * discountPercent) / 100);
}

export function applyPercentDiscount(baseInCents: number, discountPercent: number) {
    return baseInCents - calculatePercentDiscountInCents(baseInCents, discountPercent);
}

export function promotionAppliesToCategory(promotion: ActivePromotion, category: ProductCategory) {
    return promotion.scope === "ALL_PRODUCTS" || promotion.category === category;
}
