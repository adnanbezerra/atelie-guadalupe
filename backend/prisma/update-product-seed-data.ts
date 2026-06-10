import "dotenv/config";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "../src/generated/prisma/client";
import { slugify } from "../src/core/utils/slug";
import { productDescriptionsBySlug, productSeed } from "./seed";

async function main() {
    const connectionString = process.env.DATABASE_URL;
    if (!connectionString) {
        throw new Error("DATABASE_URL não configurada");
    }

    const adapter = new PrismaPg({
        connectionString
    });
    const prisma = new PrismaClient({
        adapter
    });

    let updatedLines = 0;
    let updatedProducts = 0;

    try {
        for (const lineSeed of productSeed) {
            const lineSlug = slugify(lineSeed.lineName);
            const line = await prisma.productLine.findUnique({
                where: {
                    slug: lineSlug
                },
                select: {
                    id: true
                }
            });

            if (!line) {
                console.warn(`Linha não encontrada: ${lineSlug}`);
                continue;
            }

            await prisma.productLine.update({
                where: {
                    slug: lineSlug
                },
                data: {
                    name: lineSeed.lineName,
                    price70gInCents: lineSeed.price70gInCents,
                    price100gInCents: lineSeed.price100gInCents
                }
            });
            updatedLines += 1;

            for (const productSeedItem of lineSeed.products) {
                const productSlug = slugify(productSeedItem.name);
                const legacySlugs =
                    "legacySlugs" in productSeedItem ? productSeedItem.legacySlugs : [];

                const product = await prisma.product.findFirst({
                    where: {
                        slug: {
                            in: [productSlug, ...legacySlugs]
                        }
                    },
                    select: {
                        id: true
                    }
                });

                if (!product) {
                    console.warn(`Produto não encontrado: ${productSlug}`);
                    continue;
                }

                await prisma.product.update({
                    where: {
                        id: product.id
                    },
                    data: {
                        lineId: line.id,
                        category: lineSeed.category,
                        name: productSeedItem.name,
                        slug: productSlug,
                        description: productDescriptionsBySlug[productSlug] ?? null,
                        shortDescription: productSeedItem.shortDescription,
                        longDescription: productSeedItem.longDescription
                    }
                });
                updatedProducts += 1;
            }
        }

        console.log(`Atualização concluída: ${updatedLines} linhas e ${updatedProducts} produtos.`);
    } finally {
        await prisma.$disconnect();
    }
}

main().catch((error) => {
    console.error(error);
    process.exit(1);
});
