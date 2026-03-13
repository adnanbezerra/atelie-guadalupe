import fp from "fastify-plugin";
import { GridFSBucket, MongoClient, Db, ObjectId } from "mongodb";
import { MongoImageStorage } from "../core/storage/mongo-image-storage";
import { ImageStorage } from "../core/storage/image-storage";

export default fp(async (fastify) => {
    const mongoUrl = process.env.MONGODB_URL;
    const dbName = process.env.MONGODB_DB_NAME;
    const mediaBaseUrl =
        process.env.MEDIA_BASE_URL ?? `http://localhost:${process.env.PORT ?? "3000"}`;

    let mongoClient: MongoClient | null = null;
    let mongoDb: Db | null = null;
    let mongoBucket: GridFSBucket | null = null;

    if (mongoUrl && dbName) {
        mongoClient = new MongoClient(mongoUrl);
        await mongoClient.connect();
        mongoDb = mongoClient.db(dbName);
        mongoBucket = new GridFSBucket(mongoDb, {
            bucketName: "product-images"
        });

        fastify.addHook("onClose", async () => {
            await mongoClient?.close();
        });
    }

    fastify.decorate("mongoClient", mongoClient);
    fastify.decorate("mongoDb", mongoDb);
    fastify.decorate("mongoBucket", mongoBucket);
    fastify.decorate(
        "imageStorage",
        new MongoImageStorage(mongoBucket, mediaBaseUrl) as ImageStorage
    );
    fastify.decorate("mongoObjectId", function (value: string) {
        return new ObjectId(value);
    });
});

declare module "fastify" {
    export interface FastifyInstance {
        mongoClient: MongoClient | null;
        mongoDb: Db | null;
        mongoBucket: GridFSBucket | null;
        imageStorage: ImageStorage;
        mongoObjectId(value: string): ObjectId;
    }
}
