import * as assert from "node:assert";
import { test } from "node:test";
import { ProductService } from "../../src/modules/products/services/product-service";

test("product service creates slug from product name", async () => {
    const repository = {
        findBySlug: async () => null,
        create: async (input: Record<string, unknown>) => ({
            ...input,
            isActive: true,
            createdAt: new Date(),
            updatedAt: new Date()
        })
    };

    const imageStorage = {
        uploadProductImage: async () => "http://localhost:3000/media/images/507f1f77bcf86cd799439011",
        deleteProductImageByUrl: async () => undefined,
        isConfigured: () => true
    };

    const service = new ProductService(repository as never, imageStorage as never);
    const result = await service.create({
        name: "Sabonete Artesanal de Lavanda",
        priceInCents: 2590,
        image: {
            filename: "lavanda.jpg",
            contentType: "image/jpeg",
            base64: "aGVsbG8="
        },
        stock: 8,
        shortDescription: "Sabonete natural com lavanda",
        longDescription: "Sabonete natural com oleo essencial de lavanda e processo artesanal."
    });

    assert.equal(result.success, true);

    if (result.success) {
        assert.equal(result.value.product.slug, "sabonete-artesanal-de-lavanda");
        assert.equal(result.value.product.imageUrl, "http://localhost:3000/media/images/507f1f77bcf86cd799439011");
    }
});
