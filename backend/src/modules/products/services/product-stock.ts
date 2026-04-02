export type ProductCategory = "SELFCARE" | "ARTISANAL";

export function hasInventoryControl(category: ProductCategory) {
    return category === "ARTISANAL";
}

export function hasAvailableStock(
    category: ProductCategory,
    stock: number | null | undefined,
    quantity: number
) {
    if (!hasInventoryControl(category)) {
        return true;
    }

    return (stock ?? 0) >= quantity;
}
