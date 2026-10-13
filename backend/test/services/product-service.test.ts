import * as assert from "node:assert";
import { test } from "node:test";
import {
    listProductLinesQuerySchema,
    listProductsQuerySchema,
    updateProductSchema
} from "../../src/modules/products/schemas/product-schema";
import { ProductService } from "../../src/modules/products/services/product-service";
import { RoleName } from "../../src/generated/prisma/enums";

function storedProduct(overrides: Record<string, unknown> = {}) {
    return {
        id: 1,
        uuid: "0195f4aa-7f18-7db5-9f32-06f4a9a2b201",
        slug: "sabonete-lavanda",
        name: "Sabonete Lavanda",
        category: "ARTISANAL",
        imageUrl: "/media/images/507f1f77bcf86cd799439011",
        stock: 8,
        shippingWeightGrams: 250,
        description: null,
        shortDescription: "Natural com lavanda",
        longDescription: "Sabonete natural com oleo essencial de lavanda.",
        isActive: true,
        line: {
            id: 1,
            uuid: "line-1",
            slug: "linha-sabonetes",
            name: "Linha Sabonetes",
            price70gInCents: 2590,
            price100gInCents: 3700
        },
        createdAt: new Date(),
        updatedAt: new Date(),
        ...overrides
    };
}

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

test("product update rejects image upload combined with image removal", () => {
    const result = updateProductSchema.safeParse({
        removeImage: true,
        image: {
            filename: "lavanda.jpg",
            contentType: "image/jpeg",
            buffer: Buffer.from("image")
        }
    });

    assert.equal(result.success, false);
});

test("product service deletes an unused product line", async () => {
    let deletedUuid: string | undefined;
    const repository = {
        findLineByUuid: async () => ({ uuid: "line-1" }),
        deleteLineByUuidIfUnused: async (uuid: string) => {
            deletedUuid = uuid;
            return true;
        }
    };
    const service = new ProductService(repository as never, {} as never, {} as never);

    const result = await service.deleteLine("line-1");

    assert.equal(result.success, true);
    assert.equal(deletedUuid, "line-1");
    if (result.success) assert.deepEqual(result.value, { deleted: true });
});

test("product service returns not found when deleting a missing product line", async () => {
    let deleteCalls = 0;
    const repository = {
        findLineByUuid: async () => null,
        deleteLineByUuidIfUnused: async () => {
            deleteCalls += 1;
            return true;
        }
    };
    const service = new ProductService(repository as never, {} as never, {} as never);

    const result = await service.deleteLine("line-1");

    assert.equal(result.success, false);
    assert.equal(deleteCalls, 0);
    if (!result.success) {
        assert.equal(result.value.statusCode, 404);
        assert.equal(result.value.code, "RESOURCE_NOT_FOUND");
    }
});

test("product service rejects deletion when product line is in use", async () => {
    const repository = {
        findLineByUuid: async () => ({ uuid: "line-1" }),
        deleteLineByUuidIfUnused: async () => false
    };
    const service = new ProductService(repository as never, {} as never, {} as never);

    const result = await service.deleteLine("line-1");

    assert.equal(result.success, false);
    if (!result.success) {
        assert.equal(result.value.statusCode, 409);
        assert.equal(result.value.code, "PRODUCT_LINE_IN_USE");
        assert.equal(result.value.message, "Esta linha ainda está vinculada a produtos.");
    }
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
        assert.equal(result.value.product.imageUrl, "/media/images/507f1f77bcf86cd799439011");
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
        list: async () => ({
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

test("product service finds active product detail by slug", async () => {
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
        findBySlug: async (slug: string) => ({
            uuid: "product-1",
            slug,
            name: "Sabonete Lavanda",
            category: "ARTISANAL",
            imageUrl: "https://cdn.exemplo.com/lavanda.jpg",
            stock: 8,
            shippingWeightGrams: 250,
            description: null,
            shortDescription: "Natural com lavanda",
            longDescription: "Sabonete natural com oleo essencial de lavanda.",
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
    const result = await service.detailBySlug("sabonete-lavanda");

    assert.equal(result.success, true);
    if (result.success) {
        assert.equal(result.value.product.slug, "sabonete-lavanda");
        assert.equal(result.value.product.activePromotion?.uuid, "promotion-1");
        assert.equal(result.value.product.promotionDiscountPercent, 15);
    }
});

test("product service returns not found for missing product detail by slug", async () => {
    const repository = {
        findBySlug: async () => null
    };
    const marketingRepository = {
        findBestActivePromotionForCategory: async () => null
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
    const result = await service.detailBySlug("sabonete-lavanda");

    assert.equal(result.success, false);
    if (!result.success) {
        assert.equal(result.value.statusCode, 404);
        assert.equal(result.value.message, "Produto nao encontrado");
    }
});

test("product service removes an image and clears its database reference", async () => {
    const product = storedProduct();
    let deletedUrl: string | null | undefined;
    let persisted: Record<string, unknown> | undefined;
    const repository = {
        findByUuid: async () => product,
        updateByUuid: async (_uuid: string, input: Record<string, unknown>) => {
            persisted = input;
            return { ...product, ...input };
        }
    };
    const imageStorage = {
        deleteProductImageByUrl: async (url: string | null) => {
            deletedUrl = url;
        }
    };
    const marketingRepository = { findBestActivePromotionForCategory: async () => null };
    const service = new ProductService(
        repository as never,
        marketingRepository as never,
        imageStorage as never
    );

    const result = await service.update(product.uuid, { removeImage: true });

    assert.equal(result.success, true);
    assert.equal(deletedUrl, product.imageUrl);
    assert.equal(persisted?.imageUrl, null);
    if (result.success) assert.equal(result.value.product.imageUrl, null);
});

test("product service keeps the image reference when storage removal fails", async () => {
    const product = storedProduct();
    let updateCalls = 0;
    const repository = {
        findByUuid: async () => product,
        updateByUuid: async () => {
            updateCalls += 1;
            return product;
        }
    };
    const imageStorage = {
        deleteProductImageByUrl: async () => {
            throw new Error("storage unavailable");
        }
    };
    const service = new ProductService(repository as never, {} as never, imageStorage as never);

    const result = await service.update(product.uuid, { removeImage: true });

    assert.equal(result.success, false);
    assert.equal(updateCalls, 0);
    if (!result.success) assert.equal(result.value.statusCode, 503);
});

test("product service restricts inactive listings to administrative roles", async () => {
    let listCalls = 0;
    const repository = {
        list: async () => {
            listCalls += 1;
            return { items: [], total: 0 };
        }
    };
    const service = new ProductService(repository as never, {} as never, {} as never);

    const publicResult = await service.list({ page: 1, pageSize: 20, status: "INACTIVE" });
    const adminResult = await service.list(
        { page: 1, pageSize: 20, status: "INACTIVE" },
        RoleName.ADMIN
    );

    assert.equal(publicResult.success, false);
    assert.equal(adminResult.success, true);
    assert.equal(listCalls, 1);
});

test("product service lets an admin read and reactivate an inactive complete product", async () => {
    const product = storedProduct({ isActive: false });
    const repository = {
        findByUuid: async () => product,
        updateByUuid: async (_uuid: string, input: Record<string, unknown>) => ({
            ...product,
            ...input
        })
    };
    const marketingRepository = { findBestActivePromotionForCategory: async () => null };
    const service = new ProductService(
        repository as never,
        marketingRepository as never,
        {} as never
    );

    const publicDetail = await service.detail(product.uuid);
    const adminDetail = await service.detail(product.uuid, RoleName.ADMIN);
    const reactivated = await service.update(product.uuid, { isActive: true });

    assert.equal(publicDetail.success, false);
    assert.equal(adminDetail.success, true);
    assert.equal(reactivated.success, true);
    if (reactivated.success) assert.equal(reactivated.value.product.isActive, true);
});
