import * as assert from "node:assert";
import { test } from "node:test";
import {
    listProductLinesQuerySchema,
    listProductsQuerySchema
} from "../../src/modules/products/schemas/product-schema";
import { ProductService } from "../../src/modules/products/services/product-service";

test("product list query maps public categories to product categories", () => {
    assert.equal(listProductsQuerySchema.parse({ category: "ARTESANATO" }).category, "ARTISANAL");
    assert.equal(listProductsQuerySchema.parse({ category: "BELEZA" }).category, "SELFCARE");
});

test("product line list query maps public categories to product categories", () => {
    assert.equal(
        listProductLinesQuerySchema.parse({ category: "ARTESANATO" }).category,
        "ARTISANAL"
    );
    assert.equal(listProductLinesQuerySchema.parse({ category: "BELEZA" }).category, "SELFCARE");
});

test("product service creates slug from product name", async () => {
    const repository = {
        findBySlug: async () => null,
        findLineByUuid: async () => ({
            id: 5,
            uuid: "line-1",
            slug: "linha-sabonetes",
            name: "Linha Sabonetes",
            price70gInCents: 2590,
            price100gInCents: 3700
        }),
        create: async (input: Record<string, unknown>) => ({
            ...input,
            line: {
                uuid: "line-1",
                slug: "linha-sabonetes",
                name: "Linha Sabonetes",
                price70gInCents: 2590,
                price100gInCents: 3700
            },
            isActive: true,
            createdAt: new Date(),
            updatedAt: new Date()
        })
    };

    const imageStorage = {
        uploadProductImage: async () =>
            "http://localhost:3000/media/images/507f1f77bcf86cd799439011",
        deleteProductImageByUrl: async () => undefined,
        isConfigured: () => true
    };
    const marketingRepository = {
        findBestActivePromotionForCategory: async () => null
    };

    const service = new ProductService(
        repository as never,
        marketingRepository as never,
        imageStorage as never
    );
    const result = await service.create({
        name: "Sabonete Artesanal de Lavanda",
        category: "ARTISANAL",
        lineUuid: "line-1",
        image: {
            filename: "lavanda.jpg",
            contentType: "image/jpeg",
            buffer: Buffer.from("hello")
        },
        stock: 8,
        shippingWeightGrams: 250,
        shortDescription: "Sabonete natural com lavanda",
        longDescription: "Sabonete natural com oleo essencial de lavanda e processo artesanal."
    });

    assert.equal(result.success, true);

    if (result.success) {
        assert.equal(result.value.product.slug, "sabonete-artesanal-de-lavanda");
        assert.equal(
            result.value.product.imageUrl,
            "/media/images/507f1f77bcf86cd799439011"
        );
    }
});

test("product service lists active promotion on products", async () => {
    const promotion = {
        uuid: "promotion-1",
        name: "Semana da Lavanda",
        slug: "semana-da-lavanda",
        scope: "CATEGORY",
        category: "ARTISANAL",
        discountPercent: 15,
        startsAt: new Date("2026-05-01T00:00:00.000Z"),
        endsAt: null
    };
    const repository = {
        listActive: async () => ({
            items: [
                {
                    uuid: "product-1",
                    slug: "sabonete-lavanda",
                    name: "Sabonete Lavanda",
                    category: "ARTISANAL",
                    imageUrl: "https://cdn.exemplo.com/lavanda.jpg",
                    stock: 8,
                    shippingWeightGrams: 250,
                    description: null,
                    shortDescription: "Natural",
                    longDescription: "Sabonete natural",
                    isActive: true,
                    line: {
                        uuid: "line-1",
                        slug: "linha-sabonetes",
                        name: "Linha Sabonetes",
                        price70gInCents: 2590,
                        price100gInCents: 3700
                    },
                    createdAt: new Date(),
                    updatedAt: new Date()
                }
            ],
            total: 1
        })
    };
    const marketingRepository = {
        findBestActivePromotionForCategory: async () => promotion
    };
    const imageStorage = {
        uploadProductImage: async () => "",
        deleteProductImageByUrl: async () => undefined,
        isConfigured: () => true
    };

    const service = new ProductService(
        repository as never,
        marketingRepository as never,
        imageStorage as never
    );
    const result = await service.list({
        page: 1,
        pageSize: 10
    });

    assert.equal(result.success, true);
    if (result.success) {
        const value = result.value as {
            items: Array<{
                activePromotion: typeof promotion | null;
                promotionDiscountPercent: number;
            }>;
        };
        const item = value.items[0] as {
            activePromotion: typeof promotion | null;
            promotionDiscountPercent: number;
        };
        assert.equal(item.activePromotion?.uuid, "promotion-1");
        assert.equal(item.promotionDiscountPercent, 15);
    }
});
