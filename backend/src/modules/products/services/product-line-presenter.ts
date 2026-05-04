type ProductLineEntity = {
    uuid: string;
    slug: string;
    name: string;
    price70gInCents: number;
    price100gInCents: number;
    createdAt: Date;
    updatedAt: Date;
};

export function presentProductLine(line: ProductLineEntity) {
    return {
        uuid: line.uuid,
        slug: line.slug,
        name: line.name,
        price70gInCents: line.price70gInCents,
        price100gInCents: line.price100gInCents,
        createdAt: line.createdAt,
        updatedAt: line.updatedAt
    };
}
