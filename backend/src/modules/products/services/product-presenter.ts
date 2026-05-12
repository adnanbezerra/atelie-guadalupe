import { listProductSizePrices } from "./product-pricing";
import { ProductCategory } from "./product-stock";

export type ActivePromotionEntity = {
    uuid: string;
    name: string;
    slug: string;
    scope: "ALL_PRODUCTS" | "CATEGORY";
    category: ProductCategory | null;
    discountPercent: number;
    startsAt: Date;
    endsAt: Date | null;
};

type ProductEntity = {
    uuid: string;
    slug: string;
    name: string;
    imageUrl: string;
    category: ProductCategory;
    stock: number | null;
    shippingWeightGrams?: number | null;
    description?: string | null;
    shortDescription: string;
    longDescription: string;
    isActive: boolean;
    line: {
        uuid: string;
        slug: string;
        name: string;
        price70gInCents: number;
        price100gInCents: number;
    };
    activePromotion?: ActivePromotionEntity | null;
    createdAt: Date;
    updatedAt: Date;
};

export function presentActivePromotion(promotion: ActivePromotionEntity | null | undefined) {
    return promotion
        ? {
              uuid: promotion.uuid,
              name: promotion.name,
              slug: promotion.slug,
              scope: promotion.scope,
              category: promotion.category,
              discountPercent: promotion.discountPercent,
              startsAt: promotion.startsAt,
              endsAt: promotion.endsAt
          }
        : null;
}

export function presentProduct(product: ProductEntity) {
    const activePromotion = presentActivePromotion(product.activePromotion);

    return {
        uuid: product.uuid,
        slug: product.slug,
        name: product.name,
        category: product.category,
        line: {
            uuid: product.line.uuid,
            slug: product.line.slug,
            name: product.line.name
        },
        priceOptions: listProductSizePrices(product.line),
        activePromotion,
        promotionDiscountPercent: activePromotion?.discountPercent ?? 0,
        imageUrl: product.imageUrl,
        stock: product.stock,
        shippingWeightGrams: product.shippingWeightGrams,
        description: product.description,
        shortDescription: product.shortDescription,
        longDescription: product.longDescription,
        isActive: product.isActive,
        createdAt: product.createdAt,
        updatedAt: product.updatedAt
    };
}
