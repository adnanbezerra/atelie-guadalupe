import "dotenv/config";
import * as bcrypt from "bcrypt";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "../src/generated/prisma/client";
import { RoleName } from "../src/generated/prisma/enums";
import { slugify } from "../src/core/utils/slug";
import { createUuid } from "../src/core/utils/uuid";

const productDescriptionsBySlug: Record<string, string> = {
    "hidrapele-adulto":
        "Creme a base de sebo bovino clarificado e oleos essenciais. Pode ser usado da testa aos pes. Trata sintomas de pele, promove saude e hidratacao profunda.",
    "hidrapele-adulto-com-acao-repelente":
        "Alem de hidratacao, reparacao e protecao, protege contra picadas de insetos por ate 8 horas.",
    "hidrapele-especial-para-dermatite":
        "Creme com sebo bovino clarificado e oleo de coco. Indicado para dermatite, eczema, psoriase e irritacoes. Hidratacao profunda sem oleos essenciais.",
    "creme-para-dores-articulares":
        "Pomada com acao relaxante natural. Alivia dores musculares, articulares e de tecidos moles.",
    "desodorante-adulto-masculino-e-feminino":
        "Desodoriza a pele e combate odores, inclusive CC cronico.",
    "hidrapele-gestante-lactante":
        "Promove restauracao, prevencao de sintomas de pele e hidratacao profunda, adequado para esse periodo.",
    "hidrapele-com-acao-repelente-gestante-lactante":
        "Hidrata e protege contra picadas de mosquitos. Formula segura para gestacao e amamentacao.",
    "desodorante-gestante-lactante": "Produto seguro para uso durante gestacao e amamentacao.",
    "hidrapele-rn":
        "Extremamente seguro para bebes. Promove protecao, hidratacao e previne assaduras.",
    "hidrapele-infantil-com-acao-de-prevencao-e-tratamento-de-assaduras":
        "Trata a pele da crianca de forma eficaz, promovendo hidratacao profunda e prevencao de assaduras.",
    "hidrapele-infantil-com-acao-repelente":
        "Protege contra picadas de insetos e hidrata profundamente a pele da crianca.",
    "desodorante-infantil":
        "Uso a partir de 6 anos. Combate odores fortes nas axilas com formulacao natural e segura."
};

const productSeed = [
    {
        lineName: "Linha RN",
        pricePerGramInCents: 170,
        category: "SELFCARE" as const,
        products: [
            {
                name: "Hidrapele RN",
                shortDescription:
                    "Hidrapele RN para cuidados delicados e protecao da pele do recem-nascido.",
                longDescription:
                    "Formula pensada para a rotina de cuidado do recem-nascido, ajudando a proteger a pele com toque suave e uso diario."
            }
        ]
    },
    {
        lineName: "Linha Infantil",
        pricePerGramInCents: 170,
        category: "SELFCARE" as const,
        products: [
            {
                name: "Hidrapele infantil com acao de prevencao e tratamento de assaduras",
                shortDescription:
                    "Hidrapele infantil para prevencao e tratamento de assaduras no cuidado diario.",
                longDescription:
                    "Produto infantil desenvolvido para ajudar na prevencao e no tratamento de assaduras, com textura pensada para a pele sensivel."
            },
            {
                name: "Hidrapele infantil com acao repelente",
                shortDescription:
                    "Hidrapele infantil com acao repelente para reforcar a protecao no dia a dia.",
                longDescription:
                    "Versao infantil do Hidrapele com acao repelente, unindo cuidado com a pele e suporte adicional para ambientes externos."
            }
        ]
    },
    {
        lineName: "Linha Adulto",
        pricePerGramInCents: 170,
        category: "SELFCARE" as const,
        products: [
            {
                name: "Hidrapele adulto",
                shortDescription:
                    "Hidrapele adulto para hidratar e proteger a pele na rotina diaria.",
                longDescription:
                    "Produto voltado ao cuidado da pele adulta, com aplicacao pratica para manutencao da hidratacao e da protecao cotidiana."
            },
            {
                name: "Hidrapele adulto com acao repelente",
                shortDescription:
                    "Hidrapele adulto com acao repelente para cuidado e protecao em ambientes externos.",
                longDescription:
                    "Formula adulta com acao repelente, indicada para quem busca cuidado com a pele e suporte adicional em exposicoes do dia a dia."
            }
        ]
    },
    {
        lineName: "Dores Articulares",
        pricePerGramInCents: 200,
        category: "SELFCARE" as const,
        products: [
            {
                name: "Creme para dores articulares",
                shortDescription:
                    "Creme pensado para uso localizado em regioes de desconforto articular.",
                longDescription:
                    "Produto da linha de dores articulares com aplicacao localizada, voltado ao cuidado complementar em momentos de desconforto."
            }
        ]
    },
    {
        lineName: "Especial",
        pricePerGramInCents: 130,
        category: "SELFCARE" as const,
        products: [
            {
                name: "Hidrapele especial para dermatite",
                shortDescription:
                    "Hidrapele especial desenvolvido para cuidados de peles com dermatite.",
                longDescription:
                    "Versao especial do Hidrapele para rotinas de cuidado mais especificas, com foco em peles que exigem maior delicadeza."
            }
        ]
    },
    {
        lineName: "Linha Gestante/Lactante",
        pricePerGramInCents: 170,
        category: "SELFCARE" as const,
        products: [
            {
                name: "Hidrapele gestante lactante",
                shortDescription:
                    "Hidrapele para gestantes e lactantes com cuidado suave para a rotina diaria.",
                longDescription:
                    "Produto pensado para o periodo de gestacao e lactacao, oferecendo cuidado diario com proposta de aplicacao delicada."
            },
            {
                name: "Hidrapele com acao repelente gestante lactante",
                shortDescription:
                    "Hidrapele com acao repelente para gestantes e lactantes em uso cotidiano.",
                longDescription:
                    "Versao com acao repelente pensada para gestantes e lactantes, conciliando protecao e cuidado com a pele."
            }
        ]
    },
    {
        lineName: "Desodorante Infantil",
        pricePerGramInCents: 200,
        category: "SELFCARE" as const,
        products: [
            {
                name: "Desodorante infantil",
                shortDescription:
                    "Desodorante infantil formulado para a rotina de cuidado e frescor diario.",
                longDescription:
                    "Produto da linha infantil com proposta de uso diario, pensado para oferecer frescor e cuidado adequado ao publico infantil."
            }
        ]
    },
    {
        lineName: "Desodorante Adulto",
        pricePerGramInCents: 200,
        category: "SELFCARE" as const,
        products: [
            {
                name: "Desodorante adulto masculino e feminino",
                shortDescription:
                    "Desodorante adulto para uso masculino e feminino na rotina diaria.",
                longDescription:
                    "Produto para o publico adulto, com uso masculino e feminino, voltado ao cuidado pessoal e frescor no dia a dia."
            }
        ]
    },
    {
        lineName: "Desodorante Gestante/Lactante",
        pricePerGramInCents: 200,
        category: "SELFCARE" as const,
        products: [
            {
                name: "Desodorante gestante lactante",
                shortDescription:
                    "Desodorante para gestantes e lactantes com proposta de uso diario.",
                longDescription:
                    "Produto pensado para o periodo de gestacao e lactacao, com foco em frescor e praticidade para a rotina de cuidado pessoal."
            }
        ]
    },
    {
        lineName: "Artesanato",
        pricePerGramInCents: 0,
        category: "ARTISANAL" as const,
        products: [
            {
                name: "Crucifixo",
                stock: 0,
                shippingWeightGrams: 5000,
                shortDescription:
                    "Crucifixo artesanal para devocao e decoracao de ambientes.",
                longDescription:
                    "Peca artesanal exclusiva enviada em caixa dedicada para proteger o item durante o transporte."
            }
        ]
    }
] as const;

const shippingBoxesSeed = [
    {
        name: "Caixa Pequena",
        slug: "caixa-pequena",
        category: "SELFCARE" as const,
        outerHeightCm: "11.50",
        outerWidthCm: "6.50",
        outerLengthCm: "6.50",
        emptyWeightGrams: 0,
        maxItems: 2
    },
    {
        name: "Caixa Grande",
        slug: "caixa-grande",
        category: "SELFCARE" as const,
        outerHeightCm: "21.00",
        outerWidthCm: "12.50",
        outerLengthCm: "12.50",
        emptyWeightGrams: 0,
        maxItems: 4
    },
    {
        name: "Caixa Artesanato",
        slug: "caixa-artesanato",
        category: "ARTISANAL" as const,
        outerHeightCm: "95.00",
        outerWidthCm: "50.00",
        outerLengthCm: "17.00",
        emptyWeightGrams: 0,
        maxItems: 1
    }
] as const;

async function main() {
    const connectionString = process.env.DATABASE_URL;
    if (!connectionString) {
        throw new Error("DATABASE_URL nao configurada");
    }

    const adminEmail = process.env.SEED_ADMIN_EMAIL;
    const adminPassword = process.env.SEED_ADMIN_PASSWORD;
    const adminDocument = process.env.SEED_ADMIN_DOCUMENT ?? "00000000000";
    const adminName = process.env.SEED_ADMIN_NAME ?? "Admin Inicial";

    const adapter = new PrismaPg({
        connectionString
    });
    const prisma = new PrismaClient({
        adapter
    });

    try {
        for (const role of [RoleName.ADMIN, RoleName.SUBADMIN, RoleName.USER]) {
            await prisma.role.upsert({
                where: {
                    name: role
                },
                update: {},
                create: {
                    name: role
                }
            });
        }

        for (const lineSeed of productSeed) {
            const lineSlug = slugify(lineSeed.lineName);

            const line = await prisma.productLine.upsert({
                where: {
                    slug: lineSlug
                },
                update: {
                    name: lineSeed.lineName,
                    pricePerGramInCents: lineSeed.pricePerGramInCents
                },
                create: {
                    uuid: createUuid(),
                    name: lineSeed.lineName,
                    slug: lineSlug,
                    pricePerGramInCents: lineSeed.pricePerGramInCents
                }
            });

            for (const productSeedItem of lineSeed.products) {
                const productSlug = slugify(productSeedItem.name);
                const stock = "stock" in productSeedItem ? productSeedItem.stock : 0;
                const shippingWeightGrams =
                    "shippingWeightGrams" in productSeedItem
                        ? productSeedItem.shippingWeightGrams
                        : null;

                await prisma.product.upsert({
                    where: {
                        slug: productSlug
                    },
                    update: {
                        lineId: line.id,
                        category: lineSeed.category,
                        name: productSeedItem.name,
                        description: productDescriptionsBySlug[productSlug] ?? null,
                        shortDescription: productSeedItem.shortDescription,
                        longDescription: productSeedItem.longDescription,
                        imageUrl: `/media/products/${productSlug}.webp`,
                        stock:
                            lineSeed.category === "ARTISANAL" ? (stock ?? 0) : null,
                        shippingWeightGrams,
                        isActive: true
                    },
                    create: {
                        uuid: createUuid(),
                        lineId: line.id,
                        category: lineSeed.category,
                        name: productSeedItem.name,
                        slug: productSlug,
                        imageUrl: `/media/products/${productSlug}.webp`,
                        stock:
                            lineSeed.category === "ARTISANAL" ? (stock ?? 0) : null,
                        shippingWeightGrams,
                        description: productDescriptionsBySlug[productSlug] ?? null,
                        shortDescription: productSeedItem.shortDescription,
                        longDescription: productSeedItem.longDescription,
                        isActive: true
                    }
                });
            }
        }

        for (const boxSeed of shippingBoxesSeed) {
            await prisma.shippingBox.upsert({
                where: {
                    slug: boxSeed.slug
                },
                update: {
                    name: boxSeed.name,
                    category: boxSeed.category,
                    outerHeightCm: boxSeed.outerHeightCm,
                    outerWidthCm: boxSeed.outerWidthCm,
                    outerLengthCm: boxSeed.outerLengthCm,
                    emptyWeightGrams: boxSeed.emptyWeightGrams,
                    maxItems: boxSeed.maxItems,
                    isActive: true
                },
                create: {
                    uuid: createUuid(),
                    name: boxSeed.name,
                    slug: boxSeed.slug,
                    category: boxSeed.category,
                    outerHeightCm: boxSeed.outerHeightCm,
                    outerWidthCm: boxSeed.outerWidthCm,
                    outerLengthCm: boxSeed.outerLengthCm,
                    emptyWeightGrams: boxSeed.emptyWeightGrams,
                    maxItems: boxSeed.maxItems,
                    isActive: true
                }
            });
        }

        if (adminEmail && adminPassword) {
            const adminRole = await prisma.role.findUniqueOrThrow({
                where: {
                    name: RoleName.ADMIN
                }
            });

            const normalizedEmail = adminEmail.trim().toLowerCase();
            const normalizedDocument = adminDocument.replace(/\D/g, "");

            const existingAdminByEmail = await prisma.user.findUnique({
                where: {
                    email: normalizedEmail
                }
            });

            if (existingAdminByEmail) {
                return;
            }

            const existingAdminByDocument = await prisma.user.findUnique({
                where: {
                    document: normalizedDocument
                }
            });

            if (existingAdminByDocument) {
                return;
            }

            const passwordHash = await bcrypt.hash(adminPassword, 12);

            await prisma.user.create({
                data: {
                    uuid: createUuid(),
                    name: adminName,
                    email: normalizedEmail,
                    document: normalizedDocument,
                    passwordHash,
                    isActive: true,
                    roleId: adminRole.id
                }
            });
        }
    } finally {
        await prisma.$disconnect();
    }
}

main().catch((error) => {
    console.error(error);
    process.exit(1);
});
