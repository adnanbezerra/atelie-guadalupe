import * as assert from "node:assert";
import { EventEmitter } from "node:events";
import { test } from "node:test";
import { ObjectId } from "mongodb";
import { MongoImageStorage } from "../../../src/core/storage/mongo-image-storage";

class FakeUploadStream extends EventEmitter {
    public readonly id = new ObjectId("507f1f77bcf86cd799439011");

    public end(): void {
        this.emit("finish");
    }
}

test("mongo image storage returns relative media URL when base URL is not configured", async () => {
    const bucket = {
        openUploadStream: () => new FakeUploadStream()
    };

    const storage = new MongoImageStorage(bucket as never, null, "");

    const imageUrl = await storage.uploadProductImage({
        filename: "lavanda.jpg",
        contentType: "image/jpeg",
        buffer: Buffer.from("image")
    });

    assert.equal(imageUrl, "/media/images/507f1f77bcf86cd799439011");
});

test("mongo image storage keeps explicit media base URL without trailing slash", async () => {
    const bucket = {
        openUploadStream: () => new FakeUploadStream()
    };

    const storage = new MongoImageStorage(bucket as never, null, "https://api.exemplo.com/");

    const imageUrl = await storage.uploadProductImage({
        filename: "lavanda.jpg",
        contentType: "image/png",
        buffer: Buffer.from("image")
    });

    assert.equal(imageUrl, "https://api.exemplo.com/media/images/507f1f77bcf86cd799439011");
});
