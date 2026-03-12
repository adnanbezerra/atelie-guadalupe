type ProductEntity = {
    uuid: string;
    slug: string;
    name: string;
    priceInCents: number;
    imageUrl: string;
    stock: number;
    shortDescription: string;
    longDescription: string;
    isActive: boolean;
    createdAt: Date;
    updatedAt: Date;
};

export function presentProduct(product: ProductEntity) {
    return {
        uuid: product.uuid,
        slug: product.slug,
        name: product.name,
        priceInCents: product.priceInCents,
        imageUrl: product.imageUrl,
        stock: product.stock,
        shortDescription: product.shortDescription,
        longDescription: product.longDescription,
        isActive: product.isActive,
        createdAt: product.createdAt,
        updatedAt: product.updatedAt
    };
}
