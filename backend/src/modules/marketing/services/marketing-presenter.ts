import { ProductCategory, PromotionScope } from "../../../generated/prisma/enums";

type CouponEntity = {
    uuid: string;
    code: string;
    discountPercent: number;
    validUntil: Date | null;
    maxUses: number;
    stackableWithPromotions: boolean;
    isActive: boolean;
    cancelledAt: Date | null;
    emailSegments?: Array<{
        email: string;
    }>;
    redemptions?: unknown[];
    createdAt: Date;
    updatedAt: Date;
};

type PromotionEntity = {
    uuid: string;
    name: string;
    slug: string;
    scope: PromotionScope;
    category: ProductCategory | null;
    discountPercent: number;
    startsAt: Date;
    endsAt: Date | null;
    isActive: boolean;
    createdAt: Date;
    updatedAt: Date;
};

export function presentCoupon(coupon: CouponEntity) {
    return {
        uuid: coupon.uuid,
        code: coupon.code,
        discountPercent: coupon.discountPercent,
        validUntil: coupon.validUntil,
        maxUses: coupon.maxUses,
        usedCount: coupon.redemptions?.length ?? 0,
        emails: coupon.emailSegments?.map((segment) => segment.email) ?? [],
        stackableWithPromotions: coupon.stackableWithPromotions,
        isActive: coupon.isActive,
        cancelledAt: coupon.cancelledAt,
        createdAt: coupon.createdAt,
        updatedAt: coupon.updatedAt
    };
}

export function presentPromotion(promotion: PromotionEntity) {
    return {
        uuid: promotion.uuid,
        name: promotion.name,
        slug: promotion.slug,
        scope: promotion.scope,
        category: promotion.category,
        discountPercent: promotion.discountPercent,
        startsAt: promotion.startsAt,
        endsAt: promotion.endsAt,
        isActive: promotion.isActive,
        createdAt: promotion.createdAt,
        updatedAt: promotion.updatedAt
    };
}
