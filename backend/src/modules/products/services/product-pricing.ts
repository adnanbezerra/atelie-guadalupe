import { ProductSize } from "../../../generated/prisma/enums";

export const PRODUCT_SIZE_GRAMS: Record<ProductSize, number> = {
    GRAMS_70: 70,
    GRAMS_100: 100
};

export function getProductSizeInGrams(size: ProductSize): number {
    return PRODUCT_SIZE_GRAMS[size];
}

export function calculateProductPriceInCents(
    pricePerGramInCents: number,
    size: ProductSize
): number {
    return pricePerGramInCents * getProductSizeInGrams(size);
}

export function listProductSizePrices(pricePerGramInCents: number) {
    return (Object.entries(PRODUCT_SIZE_GRAMS) as Array<[ProductSize, number]>).map(
        ([size, grams]) => ({
            size,
            grams,
            priceInCents: pricePerGramInCents * grams
        })
    );
}
