import { listProductSizePrices } from "./product-pricing";
import { ProductCategory } from "./product-stock";

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
        pricePerGramInCents: number;
    };
    createdAt: Date;
    updatedAt: Date;
};

export function presentProduct(product: ProductEntity) {
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
        priceOptions: listProductSizePrices(product.line.pricePerGramInCents),
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
