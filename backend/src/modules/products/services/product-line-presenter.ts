type ProductLineEntity = {
    uuid: string;
    slug: string;
    name: string;
    pricePerGramInCents: number;
    createdAt: Date;
    updatedAt: Date;
};

export function presentProductLine(line: ProductLineEntity) {
    return {
        uuid: line.uuid,
        slug: line.slug,
        name: line.name,
        pricePerGramInCents: line.pricePerGramInCents,
        createdAt: line.createdAt,
        updatedAt: line.updatedAt
    };
}
