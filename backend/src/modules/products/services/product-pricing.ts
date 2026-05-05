import { ProductSize } from "../../../generated/prisma/enums";

export const PRODUCT_SIZE_GRAMS: Record<ProductSize, number> = {
    GRAMS_70: 70,
    GRAMS_100: 100
};

export function getProductSizeInGrams(size: ProductSize): number {
    return PRODUCT_SIZE_GRAMS[size];
}

export function calculateProductPriceInCents(prices: ProductSizePrices, size: ProductSize): number {
    return size === "GRAMS_70" ? prices.price70gInCents : prices.price100gInCents;
}

export type ProductSizePrices = {
    price70gInCents: number;
    price100gInCents: number;
};

export function listProductSizePrices(prices: ProductSizePrices) {
    return (Object.entries(PRODUCT_SIZE_GRAMS) as Array<[ProductSize, number]>).map(
        ([size, grams]) => ({
            size,
            grams,
            priceInCents: calculateProductPriceInCents(prices, size)
        })
    );
}
