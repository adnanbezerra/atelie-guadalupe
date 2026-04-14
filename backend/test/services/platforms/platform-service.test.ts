import * as assert from "node:assert";
import { test } from "node:test";
import { PlatformService } from "../../../src/modules/platforms/services/platform-service";

test("platform service creates a platform and clears previous default when needed", async () => {
    let unsetDefaultsCalls = 0;

    const repository = {
        findBySlug: async () => null,
        unsetDefaultPlatforms: async () => {
            unsetDefaultsCalls += 1;
        },
        create: async (input: Record<string, unknown>) => ({
            ...input,
            email: input.email ?? null,
            phone: input.phone ?? null,
            document: input.document ?? null,
            websiteUrl: input.websiteUrl ?? null,
            createdAt: new Date(),
            updatedAt: new Date(),
            address: {
                ...(input.address as Record<string, unknown>),
                createdAt: new Date(),
                updatedAt: new Date(),
                isDefault: false
            }
        })
    };

    const service = new PlatformService(repository as never);
    const result = await service.create({
        name: "Atelie Guadalupe",
        email: "contato@atelie.com",
        websiteUrl: "http://localhost:3000",
        isDefault: true,
        address: {
            recipient: "Atelie Guadalupe",
            zipCode: "01153000",
            street: "Rua A",
            number: "10",
            neighborhood: "Centro",
            city: "Sao Paulo",
            state: "SP",
            country: "Brasil"
        }
    });

    assert.equal(result.success, true);
    assert.equal(unsetDefaultsCalls, 1);

    if (result.success) {
        assert.equal(result.value.platform.slug, "atelie-guadalupe");
        assert.equal(result.value.platform.address?.zipCode, "01153000");
    }
});
