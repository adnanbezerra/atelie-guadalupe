import { listProductSizePrices } from "./product-pricing";

type ProductEntity = {
    uuid: string;
    slug: string;
    name: string;
    imageUrl: string;
    stock: number;
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
        line: {
            uuid: product.line.uuid,
            slug: product.line.slug,
            name: product.line.name
        },
        priceOptions: listProductSizePrices(product.line.pricePerGramInCents),
        imageUrl: product.imageUrl,
        stock: product.stock,
        shortDescription: product.shortDescription,
        longDescription: product.longDescription,
        isActive: product.isActive,
        createdAt: product.createdAt,
        updatedAt: product.updatedAt
    };
}
