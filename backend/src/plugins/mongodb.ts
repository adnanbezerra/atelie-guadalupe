import fp from "fastify-plugin";
import { GridFSBucket, MongoClient, Db, ObjectId } from "mongodb";
import { MongoImageStorage } from "../core/storage/mongo-image-storage";
import { ImageStorage } from "../core/storage/image-storage";

export default fp(async (fastify) => {
    const mongoUrl = process.env.MONGODB_URL;
    const dbName = process.env.MONGODB_DB_NAME ?? process.env.MONGODB_NAME;
    const mediaBaseUrl = process.env.MEDIA_BASE_URL ?? "";

    let mongoClient: MongoClient | null = null;
    let mongoDb: Db | null = null;
    let mongoBucket: GridFSBucket | null = null;
    let mongoVideoBucket: GridFSBucket | null = null;

    if (mongoUrl && dbName) {
        mongoClient = new MongoClient(mongoUrl, {
            connectTimeoutMS: 5_000,
            serverSelectionTimeoutMS: 8_000
        });
        await mongoClient.connect();
        mongoDb = mongoClient.db(dbName);
        mongoBucket = new GridFSBucket(mongoDb, {
            bucketName: "product-images"
        });
        mongoVideoBucket = new GridFSBucket(mongoDb, {
            bucketName: "testimonial-videos"
        });

        fastify.addHook("onClose", async () => {
            await mongoClient?.close();
        });
    }

    fastify.decorate("mongoClient", mongoClient);
    fastify.decorate("mongoDb", mongoDb);
    fastify.decorate("mongoBucket", mongoBucket);
    fastify.decorate("mongoVideoBucket", mongoVideoBucket);
    fastify.decorate(
        "imageStorage",
        new MongoImageStorage(mongoBucket, mongoVideoBucket, mediaBaseUrl) as ImageStorage
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
        mongoVideoBucket: GridFSBucket | null;
        imageStorage: ImageStorage;
        mongoObjectId(value: string): ObjectId;
    }
}
