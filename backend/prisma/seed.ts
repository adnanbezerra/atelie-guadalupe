import "dotenv/config";
import * as bcrypt from "bcrypt";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "../src/generated/prisma/client";
import { PromotionScope, RoleName, TestimonialType } from "../src/generated/prisma/enums";
import { slugify } from "../src/core/utils/slug";
import { createUuid } from "../src/core/utils/uuid";

export const productDescriptionsBySlug: Record<string, string> = {
    "hidrapele-adulto":
        "Creme à base de sebo bovino clarificado e óleos essenciais. Pode ser usado da testa aos pés. Trata sintomas de pele, promove saúde e hidratação profunda.",
    "hidrapele-adulto-com-acao-repelente":
        "Além de hidratação, reparação e proteção, protege contra picadas de insetos por até 8 horas.",
    "hidrapele-especial-para-dermatite":
        "Creme com sebo bovino clarificado e óleo de coco. Indicado para dermatite, eczema, psoríase e irritações. Hidratação profunda sem óleos essenciais.",
    "hidrapele-especial-para-lupus-psoriase":
        "Creme especial para rotinas de cuidado de peles com lúpus e psoríase.",
    "hidrapele-para-dores-articulares":
        "Pomada com ação relaxante natural. Alivia dores musculares, articulares e de tecidos moles.",
    "desodorante-adulto-masculino-e-feminino":
        "Desodoriza a pele e combate odores, inclusive CC crônico.",
    "hidrapele-gestante-lactante":
        "Promove restauração, prevenção de sintomas de pele e hidratação profunda, adequado para esse período.",
    "hidrapele-com-acao-repelente-gestante-lactante":
        "Hidrata e protege contra picadas de mosquitos. Fórmula segura para gestação e amamentação.",
    "desodorante-gestante-lactante": "Produto seguro para uso durante gestação e amamentação.",
    "hidrapele-rn":
        "Extremamente seguro para bebês. Promove proteção, hidratação e previne assaduras.",
    "hidrapele-infantil-com-acao-de-prevencao-e-tratamento-de-assaduras":
        "Trata a pele da criança de forma eficaz, promovendo hidratação profunda e prevenção de assaduras.",
    "hidrapele-infantil-com-acao-repelente":
        "Protege contra picadas de insetos e hidrata profundamente a pele da criança.",
    "desodorante-infantil":
        "Uso a partir de 6 anos. Combate odores fortes nas axilas com formulação natural e segura."
};

const productIngredientsBySlug: Record<string, readonly string[]> = {
    "desodorante-gestante-lactante": [
        "sebo bovino",
        "óleo de coco",
        "calêndula",
        "camomila alemã",
        "semente de uva",
        "rosa mosqueta",
        "copaíba resina",
        "lavanda",
        "melaleuca",
        "eucalipto",
        "bicarbonato de sódio",
        "magnésio PA"
    ],
    "hidrapele-especial-para-dermatite": ["sebo bovino", "óleo de coco"],
    "hidrapele-para-dores-articulares": [
        "sebo bovino",
        "óleo de coco",
        "calêndula",
        "camomila alemã",
        "semente de uva",
        "rosa mosqueta",
        "copaíba resina",
        "lavanda",
        "melaleuca",
        "orégano",
        "eucalipto",
        "alecrim",
        "magnésio",
        "dolamita"
    ],
    "hidrapele-infantil-com-acao-de-prevencao-e-tratamento-de-assaduras": [
        "sebo bovino",
        "óleo de coco",
        "calêndula",
        "camomila alemã",
        "semente de uva",
        "rosa mosqueta",
        "copaíba resina",
        "lavanda",
        "melaleuca",
        "olíbano"
    ],
    "desodorante-adulto-masculino-e-feminino": [
        "sebo bovino",
        "óleo de coco",
        "calêndula",
        "camomila alemã",
        "semente de uva",
        "rosa mosqueta",
        "copaíba resina",
        "lavanda",
        "melaleuca",
        "cedro",
        "eucalipto",
        "orégano",
        "magnésio",
        "bicarbonato"
    ],
    "hidrapele-adulto": [
        "sebo bovino",
        "óleo de coco",
        "calêndula",
        "camomila alemã",
        "semente de uva",
        "rosa mosqueta",
        "copaíba resina",
        "lavanda",
        "melaleuca",
        "gerânio",
        "olíbano"
    ],
    "hidrapele-infantil-com-acao-repelente": [
        "sebo bovino",
        "óleo de coco",
        "calêndula",
        "camomila alemã",
        "semente de uva",
        "rosa mosqueta",
        "copaíba resina",
        "lavanda",
        "melaleuca",
        "cravo",
        "orégano",
        "citronela"
    ],
    "hidrapele-gestante-lactante": [
        "sebo bovino",
        "óleo de coco",
        "calêndula",
        "camomila alemã",
        "semente de uva",
        "rosa mosqueta",
        "copaíba resina",
        "lavanda",
        "melaleuca"
    ]
};

function withIngredients(description: string, ingredients?: readonly string[]) {
    if (!ingredients) {
        return description;
    }

    return `${description}\n\nIngredientes: ${ingredients.join(", ")}`;
}

export const productSeed = [
    {
        lineName: "Linha RN",
        price70gInCents: 11900,
        price100gInCents: 17000,
        category: "SELFCARE" as const,
        products: [
            {
                name: "Hidrapele RN",
                shortDescription:
                    "Hidrapele RN para cuidados delicados e proteção da pele do recém-nascido.",
                longDescription:
                    "Fórmula pensada para a rotina de cuidado do recém-nascido, ajudando a proteger a pele com toque suave e uso diário."
            }
        ]
    },
    {
        lineName: "Linha Infantil",
        price70gInCents: 11900,
        price100gInCents: 17000,
        category: "SELFCARE" as const,
        products: [
            {
                name: "Hidrapele infantil com acao de prevencao e tratamento de assaduras",
                shortDescription:
                    "Hidrapele infantil para prevenção e tratamento de assaduras no cuidado diário.",
                longDescription: withIngredients(
                    "Produto infantil desenvolvido para ajudar na prevenção e no tratamento de assaduras, com textura pensada para a pele sensível.",
                    productIngredientsBySlug[
                        "hidrapele-infantil-com-acao-de-prevencao-e-tratamento-de-assaduras"
                    ]
                )
            },
            {
                name: "Hidrapele infantil com acao repelente",
                shortDescription:
                    "Hidrapele infantil com ação repelente para reforçar a proteção no dia a dia.",
                longDescription: withIngredients(
                    "Versão infantil do Hidrapele com ação repelente, unindo cuidado com a pele e suporte adicional para ambientes externos.",
                    productIngredientsBySlug["hidrapele-infantil-com-acao-repelente"]
                )
            }
        ]
    },
    {
        lineName: "Linha Adulto",
        price70gInCents: 11900,
        price100gInCents: 17000,
        category: "SELFCARE" as const,
        products: [
            {
                name: "Hidrapele adulto",
                shortDescription:
                    "Hidrapele adulto para hidratar e proteger a pele na rotina diária.",
                longDescription: withIngredients(
                    "Produto voltado ao cuidado da pele adulta, com aplicação prática para manutenção da hidratação e da proteção cotidiana.",
                    productIngredientsBySlug["hidrapele-adulto"]
                )
            },
            {
                name: "Hidrapele adulto com acao repelente",
                shortDescription:
                    "Hidrapele adulto com ação repelente para cuidado e proteção em ambientes externos.",
                longDescription:
                    "Fórmula adulta com ação repelente, indicada para quem busca cuidado com a pele e suporte adicional em exposições do dia a dia."
            }
        ]
    },
    {
        lineName: "Dores Articulares",
        price70gInCents: 14000,
        price100gInCents: 20000,
        category: "SELFCARE" as const,
        products: [
            {
                name: "Hidrapele para dores articulares",
                legacySlugs: ["creme-para-dores-articulares"],
                shortDescription:
                    "Hidrapele pensado para uso localizado em regiões de desconforto articular.",
                longDescription: withIngredients(
                    "Produto da linha de dores articulares com aplicação localizada, voltado ao cuidado complementar em momentos de desconforto.",
                    productIngredientsBySlug["hidrapele-para-dores-articulares"]
                )
            }
        ]
    },
    {
        lineName: "Especial",
        price70gInCents: 10500,
        price100gInCents: 15000,
        category: "SELFCARE" as const,
        products: [
            {
                name: "Hidrapele especial para dermatite",
                shortDescription:
                    "Hidrapele especial desenvolvido para cuidados de peles com dermatite.",
                longDescription: withIngredients(
                    "Versão especial do Hidrapele para rotinas de cuidado mais específicas, com foco em peles que exigem maior delicadeza.",
                    productIngredientsBySlug["hidrapele-especial-para-dermatite"]
                )
            }
        ]
    },
    {
        lineName: "Especial Lupus Psoriase",
        price70gInCents: 11900,
        price100gInCents: 17000,
        category: "SELFCARE" as const,
        products: [
            {
                name: "Hidrapele especial para Lupus, psoriase",
                shortDescription:
                    "Hidrapele especial desenvolvido para cuidados de peles com lúpus e psoríase.",
                longDescription:
                    "Versão especial do Hidrapele para rotinas de cuidado específicas, com foco em peles que exigem atenção constante."
            }
        ]
    },
    {
        lineName: "Linha Gestante/Lactante",
        price70gInCents: 11900,
        price100gInCents: 17000,
        category: "SELFCARE" as const,
        products: [
            {
                name: "Hidrapele gestante lactante",
                shortDescription:
                    "Hidrapele para gestantes e lactantes com cuidado suave para a rotina diária.",
                longDescription: withIngredients(
                    "Produto pensado para o período de gestação e lactação, oferecendo cuidado diário com proposta de aplicação delicada.",
                    productIngredientsBySlug["hidrapele-gestante-lactante"]
                )
            },
            {
                name: "Hidrapele com acao repelente gestante lactante",
                shortDescription:
                    "Hidrapele com ação repelente para gestantes e lactantes em uso cotidiano.",
                longDescription:
                    "Versão com ação repelente pensada para gestantes e lactantes, conciliando proteção e cuidado com a pele."
            }
        ]
    },
    {
        lineName: "Desodorante Infantil",
        price70gInCents: 14000,
        price100gInCents: 20000,
        category: "SELFCARE" as const,
        products: [
            {
                name: "Desodorante infantil",
                shortDescription:
                    "Desodorante infantil formulado para a rotina de cuidado e frescor diário.",
                longDescription:
                    "Produto da linha infantil com proposta de uso diário, pensado para oferecer frescor e cuidado adequado ao público infantil."
            }
        ]
    },
    {
        lineName: "Desodorante Adulto",
        price70gInCents: 14000,
        price100gInCents: 20000,
        category: "SELFCARE" as const,
        products: [
            {
                name: "Desodorante adulto masculino e feminino",
                shortDescription:
                    "Desodorante adulto para uso masculino e feminino na rotina diária.",
                longDescription: withIngredients(
                    "Produto para o público adulto, com uso masculino e feminino, voltado ao cuidado pessoal e frescor no dia a dia.",
                    productIngredientsBySlug["desodorante-adulto-masculino-e-feminino"]
                )
            }
        ]
    },
    {
        lineName: "Desodorante Gestante/Lactante",
        price70gInCents: 14000,
        price100gInCents: 20000,
        category: "SELFCARE" as const,
        products: [
            {
                name: "Desodorante gestante lactante",
                shortDescription:
                    "Desodorante para gestantes e lactantes com proposta de uso diário.",
                longDescription: withIngredients(
                    "Produto pensado para o período de gestação e lactação, com foco em frescor e praticidade para a rotina de cuidado pessoal.",
                    productIngredientsBySlug["desodorante-gestante-lactante"]
                )
            }
        ]
    },
    {
        lineName: "Artesanato",
        price70gInCents: 0,
        price100gInCents: 0,
        category: "ARTISANAL" as const,
        products: [
            {
                name: "Crucifixo",
                imageUrl:
                    "https://atelie-guadalupe-backend.ithx86.easypanel.host/media/images/6a03517f232ecbb0376498aa",
                stock: 0,
                shippingWeightGrams: 5000,
                shortDescription: "Crucifixo artesanal para devoção e decoração de ambientes.",
                longDescription:
                    "Peça artesanal exclusiva enviada em caixa dedicada para proteger o item durante o transporte."
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

const promotionsSeed = [
    {
        name: "Promocao inicial 5%",
        slug: "promocao-inicial-5",
        scope: PromotionScope.ALL_PRODUCTS,
        category: null,
        discountPercent: 5,
        startsAt: new Date("2026-05-04T00:00:00.000Z"),
        endsAt: null,
        isActive: true
    }
] as const;

const testimonialsSeed = [
    {
        uuid: "019e18cf-df46-76b9-a76f-fcaeef90fd97",
        type: TestimonialType.VIDEO,
        title: "Michelly Araújo - Nutricionista GAPS",
        text: null,
        videoUrl:
            "https://atelie-guadalupe-backend.ithx86.easypanel.host/media/videos/6a0241803f751b1ad1d76ee8",
        isActive: true
    }
] as const;

const platformSeed = {
    name: "Atelie Guadalupe",
    slug: "atelie-guadalupe",
    email: "contato@atelieguadalupe.com",
    phone: null,
    document: null,
    websiteUrl: "http://localhost:3000",
    isActive: true,
    isDefault: true,
    address: {
        document: null,
        zipCode: "01153000",
        street: "Rua de Origem",
        number: "123",
        complement: null,
        neighborhood: "Centro",
        city: "Sao Paulo",
        state: "SP",
        country: "Brasil",
        reference: null
    }
} as const;

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

        const platform = await prisma.platform.upsert({
            where: {
                slug: platformSeed.slug
            },
            update: {
                name: platformSeed.name,
                email: platformSeed.email,
                phone: platformSeed.phone,
                document: platformSeed.document,
                websiteUrl: platformSeed.websiteUrl,
                isActive: platformSeed.isActive,
                isDefault: platformSeed.isDefault
            },
            create: {
                uuid: createUuid(),
                name: platformSeed.name,
                slug: platformSeed.slug,
                email: platformSeed.email,
                phone: platformSeed.phone,
                document: platformSeed.document,
                websiteUrl: platformSeed.websiteUrl,
                isActive: platformSeed.isActive,
                isDefault: platformSeed.isDefault
            }
        });

        await prisma.address.upsert({
            where: {
                platformId: platform.id
            },
            update: {
                label: "Plataforma",
                document: platformSeed.address.document,
                zipCode: platformSeed.address.zipCode,
                street: platformSeed.address.street,
                number: platformSeed.address.number,
                complement: platformSeed.address.complement,
                neighborhood: platformSeed.address.neighborhood,
                city: platformSeed.address.city,
                state: platformSeed.address.state,
                country: platformSeed.address.country,
                reference: platformSeed.address.reference,
                userId: null
            },
            create: {
                uuid: createUuid(),
                platformId: platform.id,
                label: "Plataforma",
                document: platformSeed.address.document,
                zipCode: platformSeed.address.zipCode,
                street: platformSeed.address.street,
                number: platformSeed.address.number,
                complement: platformSeed.address.complement,
                neighborhood: platformSeed.address.neighborhood,
                city: platformSeed.address.city,
                state: platformSeed.address.state,
                country: platformSeed.address.country,
                reference: platformSeed.address.reference
            }
        });

        for (const lineSeed of productSeed) {
            const lineSlug = slugify(lineSeed.lineName);

            const line = await prisma.productLine.upsert({
                where: {
                    slug: lineSlug
                },
                update: {
                    name: lineSeed.lineName,
                    price70gInCents: lineSeed.price70gInCents,
                    price100gInCents: lineSeed.price100gInCents
                },
                create: {
                    uuid: createUuid(),
                    name: lineSeed.lineName,
                    slug: lineSlug,
                    price70gInCents: lineSeed.price70gInCents,
                    price100gInCents: lineSeed.price100gInCents
                }
            });

            for (const productSeedItem of lineSeed.products) {
                const productSlug = slugify(productSeedItem.name);
                const legacySlugs =
                    "legacySlugs" in productSeedItem ? productSeedItem.legacySlugs : [];
                const stock = "stock" in productSeedItem ? productSeedItem.stock : 0;
                const shippingWeightGrams =
                    "shippingWeightGrams" in productSeedItem
                        ? productSeedItem.shippingWeightGrams
                        : null;
                const imageUrl =
                    "imageUrl" in productSeedItem
                        ? productSeedItem.imageUrl
                        : `/media/products/${productSlug}.webp`;

                if (legacySlugs.length > 0) {
                    const existingProduct = await prisma.product.findUnique({
                        where: {
                            slug: productSlug
                        },
                        select: {
                            id: true
                        }
                    });

                    if (!existingProduct) {
                        const legacyProduct = await prisma.product.findFirst({
                            where: {
                                slug: {
                                    in: [...legacySlugs]
                                }
                            },
                            select: {
                                id: true
                            }
                        });

                        if (legacyProduct) {
                            await prisma.product.update({
                                where: {
                                    id: legacyProduct.id
                                },
                                data: {
                                    slug: productSlug
                                }
                            });
                        }
                    }
                }

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
                        imageUrl,
                        stock: lineSeed.category === "ARTISANAL" ? (stock ?? 0) : null,
                        shippingWeightGrams,
                        isActive: true
                    },
                    create: {
                        uuid: createUuid(),
                        lineId: line.id,
                        category: lineSeed.category,
                        name: productSeedItem.name,
                        slug: productSlug,
                        imageUrl,
                        stock: lineSeed.category === "ARTISANAL" ? (stock ?? 0) : null,
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

        for (const promotionSeed of promotionsSeed) {
            await prisma.promotion.upsert({
                where: {
                    slug: promotionSeed.slug
                },
                update: {
                    name: promotionSeed.name,
                    scope: promotionSeed.scope,
                    category: promotionSeed.category,
                    discountPercent: promotionSeed.discountPercent,
                    startsAt: promotionSeed.startsAt,
                    endsAt: promotionSeed.endsAt,
                    isActive: promotionSeed.isActive
                },
                create: {
                    uuid: createUuid(),
                    name: promotionSeed.name,
                    slug: promotionSeed.slug,
                    scope: promotionSeed.scope,
                    category: promotionSeed.category,
                    discountPercent: promotionSeed.discountPercent,
                    startsAt: promotionSeed.startsAt,
                    endsAt: promotionSeed.endsAt,
                    isActive: promotionSeed.isActive
                }
            });
        }

        for (const testimonialSeed of testimonialsSeed) {
            await prisma.testimonial.upsert({
                where: {
                    uuid: testimonialSeed.uuid
                },
                update: {
                    type: testimonialSeed.type,
                    title: testimonialSeed.title,
                    text: testimonialSeed.text,
                    videoUrl: testimonialSeed.videoUrl,
                    isActive: testimonialSeed.isActive
                },
                create: {
                    uuid: testimonialSeed.uuid,
                    type: testimonialSeed.type,
                    title: testimonialSeed.title,
                    text: testimonialSeed.text,
                    videoUrl: testimonialSeed.videoUrl,
                    isActive: testimonialSeed.isActive
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

if (require.main === module) {
    main().catch((error) => {
        console.error(error);
        process.exit(1);
    });
}
