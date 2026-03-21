import { LOW_STOCK_THRESHOLD } from "@/lib/constants";
import { CollectionKey, Product, ProductLine } from "@/lib/types";

export type CollectionSlug = "beleza-natural" | "artesanato";

export const COLLECTION_CONFIG = {
    beauty: {
        title: "Beleza Natural",
        description:
            "Cosmeticos botanicos, saboaria artesanal e linhas de cuidado pensadas para o ritual diario.",
        heroAccent: "Botica, sabonetes e formulas autorais",
    },
    crafts: {
        title: "Artesanato e Artes Sacras",
        description:
            "Ceramicas, presentes de fe e pecas para casa com presenca artesanal e simbolismo.",
        heroAccent: "Casa, altar e presentes com assinatura manual",
    },
} as const;

const BEAUTY_KEYWORDS = [
    "beleza",
    "botica",
    "creme",
    "serum",
    "sabonete",
    "oleo",
    "cosmet",
    "lavanda",
];

const CRAFT_KEYWORDS = [
    "arte",
    "sacra",
    "vela",
    "terco",
    "ceram",
    "macrame",
    "artesan",
    "altar",
    "caneca",
];

function includesKeyword(value: string, keywords: string[]) {
    const normalized = value.toLowerCase();
    return keywords.some((keyword) => normalized.includes(keyword));
}

export function inferCollection(product: Product): CollectionKey {
    const searchable = [
        product.name,
        product.shortDescription,
        product.longDescription,
        product.line.name,
        product.line.slug,
    ].join(" ");

    if (includesKeyword(searchable, CRAFT_KEYWORDS)) {
        return "crafts";
    }

    if (includesKeyword(searchable, BEAUTY_KEYWORDS)) {
        return "beauty";
    }

    return product.stock <= LOW_STOCK_THRESHOLD ? "crafts" : "beauty";
}

export function getCollectionCopy(collection: CollectionKey) {
    return COLLECTION_CONFIG[collection];
}

export function getFeaturedCollections(products: Product[]) {
    return {
        beauty: products
            .filter((product) => inferCollection(product) === "beauty")
            .slice(0, 4),
        crafts: products
            .filter((product) => inferCollection(product) === "crafts")
            .slice(0, 4),
    };
}

export function filterProductsByCollection(
    products: Product[],
    collection: CollectionSlug | CollectionKey,
) {
    const normalizedCollection =
        collection === "beleza-natural"
            ? "beauty"
            : collection === "artesanato"
              ? "crafts"
              : collection;

    return products.filter(
        (product) => inferCollection(product) === normalizedCollection,
    );
}

export function filterLinesByCollection(
    lines: ProductLine[],
    collection: CollectionSlug | CollectionKey,
) {
    const normalizedCollection =
        collection === "beleza-natural"
            ? "beauty"
            : collection === "artesanato"
              ? "crafts"
              : collection;

    return lines.filter((line) =>
        normalizedCollection === "beauty"
            ? !includesKeyword(`${line.name} ${line.slug}`, CRAFT_KEYWORDS)
            : includesKeyword(`${line.name} ${line.slug}`, CRAFT_KEYWORDS),
    );
}

export function getHeroHighlights(products: Product[]) {
    return [...products]
        .sort((left, right) => right.stock - left.stock)
        .slice(0, 3);
}
