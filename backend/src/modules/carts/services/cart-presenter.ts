import { ProductSize } from "../../../generated/prisma/enums";
import { getProductSizeInGrams } from "../../products/services/product-pricing";
import { presentActivePromotion } from "../../products/services/product-presenter";
import { hasAvailableStock, ProductCategory } from "../../products/services/product-stock";

type CartItemEntity = {
    uuid: string;
    productSize: ProductSize;
    quantity: number;
    unitPriceInCents: number;
    productNameSnapshot: string;
    product: {
        uuid: string;
        category: ProductCategory;
        imageUrl: string;
        stock: number | null;
        isActive: boolean;
        activePromotion?: {
            uuid: string;
            name: string;
            slug: string;
            scope: "ALL_PRODUCTS" | "CATEGORY";
            category: ProductCategory | null;
            discountPercent: number;
            startsAt: Date;
            endsAt: Date | null;
        } | null;
    };
};

type CartEntity = {
    uuid: string;
    coupon?: {
        uuid: string;
        code: string;
        discountPercent: number;
    } | null;
    items: CartItemEntity[];
};

function calculateCouponDiscountInCents(subtotalInCents: number, discountPercent: number) {
    return Math.floor((subtotalInCents * discountPercent) / 100);
}

export function presentCartItem(item: CartItemEntity) {
    const isAvailable =
        item.product.isActive &&
        hasAvailableStock(item.product.category, item.product.stock, item.quantity);
    const activePromotion = presentActivePromotion(item.product.activePromotion);

    return {
        uuid: item.uuid,
        productUuid: item.product.uuid,
        name: item.productNameSnapshot,
        productSize: item.productSize,
        grams: getProductSizeInGrams(item.productSize),
        quantity: item.quantity,
        unitPriceInCents: item.unitPriceInCents,
        totalPriceInCents: item.unitPriceInCents * item.quantity,
        activePromotion,
        promotionDiscountPercent: activePromotion?.discountPercent ?? 0,
        imageUrl: item.product.imageUrl,
        isAvailable
    };
}

export function presentCart(cart: CartEntity) {
    const items = cart.items.map((item) => presentCartItem(item));
    const subtotalInCents = items.reduce((total, item) => total + item.totalPriceInCents, 0);
    const couponDiscountInCents = cart.coupon
        ? calculateCouponDiscountInCents(subtotalInCents, cart.coupon.discountPercent)
        : 0;

    return {
        uuid: cart.uuid,
        items,
        coupon: cart.coupon
            ? {
                  uuid: cart.coupon.uuid,
                  code: cart.coupon.code,
                  discountPercent: cart.coupon.discountPercent,
                  discountInCents: couponDiscountInCents
              }
            : null,
        summary: {
            itemsCount: items.reduce((total, item) => total + item.quantity, 0),
            subtotalInCents,
            couponDiscountInCents,
            totalInCents: subtotalInCents - couponDiscountInCents
        }
    };
}
