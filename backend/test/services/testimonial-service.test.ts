import * as assert from "node:assert";
import { test } from "node:test";
import { TestimonialService } from "../../src/modules/testimonials/services/testimonial-service";

function createRepository() {
    const items = new Map<string, Record<string, unknown>>();

    return {
        items,
        listAll: async () => [...items.values()],
        listActive: async () => [...items.values()].filter((item) => item.isActive),
        findByUuid: async (uuid: string) => items.get(uuid) ?? null,
        upsert: async (input: {
            uuid: string;
            create: Record<string, unknown>;
            update: Record<string, unknown>;
        }) => {
            const now = new Date();
            const existing = items.get(input.uuid);
            const next = existing
                ? { ...existing, ...input.update, updatedAt: now }
                : {
                      id: items.size + 1,
                      ...input.create,
                      createdAt: now,
                      updatedAt: now
                  };

            items.set(input.uuid, next);
            return next;
        },
        deactivateByUuid: async (uuid: string) => {
            const existing = items.get(uuid)!;
            const next = { ...existing, isActive: false, updatedAt: new Date() };
            items.set(uuid, next);
            return next;
        },
        deleteByUuid: async (uuid: string) => {
            const existing = items.get(uuid)!;
            items.delete(uuid);
            return existing;
        }
    };
}

function createStorage() {
    const storage = {
        uploadedVideos: 0,
        deletedVideos: [] as string[],
        uploadProductImage: async () => "http://localhost:3000/media/images/image-id",
        uploadTestimonialVideo: async () => {
            return `http://localhost:3000/media/videos/video-${++storage.uploadedVideos}`;
        },
        deleteProductImageByUrl: async () => undefined,
        deleteTestimonialVideoByUrl: async (url: string) => {
            storage.deletedVideos.push(url);
        },
        isConfigured: () => true
    };

    return storage;
}

test("testimonial service creates text testimonial", async () => {
    const repository = createRepository();
    const storage = createStorage();
    const service = new TestimonialService(repository as never, storage as never);

    const result = await service.upsert({
        type: "TEXT",
        text: "Atendimento excelente",
        isActive: true
    });

    assert.equal(result.success, true);

    if (result.success) {
        assert.equal(result.value.testimonial.type, "TEXT");
        assert.equal(result.value.testimonial.text, "Atendimento excelente");
        assert.equal(result.value.testimonial.videoUrl, null);
    }
});

test("testimonial service requires video for video testimonial", async () => {
    const service = new TestimonialService(createRepository() as never, createStorage() as never);

    const result = await service.upsert({
        type: "VIDEO",
        isActive: true
    });

    assert.equal(result.success, false);
});

test("testimonial service deletes old video when switching to text", async () => {
    const repository = createRepository();
    const storage = createStorage();
    const service = new TestimonialService(repository as never, storage as never);

    const created = await service.upsert({
        type: "VIDEO",
        video: {
            filename: "depoimento.mp4",
            contentType: "video/mp4",
            buffer: Buffer.from("video")
        },
        isActive: true
    });

    assert.equal(created.success, true);
    if (!created.success) {
        return;
    }

    const updated = await service.upsert({
        uuid: created.value.testimonial.uuid,
        type: "TEXT",
        text: "Agora em texto",
        isActive: true
    });

    assert.equal(updated.success, true);
    assert.deepEqual(storage.deletedVideos, ["http://localhost:3000/media/videos/video-1"]);
});
