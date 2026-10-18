import * as assert from "node:assert";
import { test } from "node:test";
import Fastify from "fastify";
import { MongoClient } from "mongodb";
import MongoDb from "../../src/plugins/mongodb";

test("mongodb indisponivel nao impede a inicializacao da API", async (t) => {
    const previousUrl = process.env.MONGODB_URL;
    const previousDbName = process.env.MONGODB_DB_NAME;
    process.env.MONGODB_URL = "mongodb://mongo.internal:27017";
    process.env.MONGODB_DB_NAME = "atelie_guadalupe";

    t.after(() => {
        if (previousUrl === undefined) delete process.env.MONGODB_URL;
        else process.env.MONGODB_URL = previousUrl;

        if (previousDbName === undefined) delete process.env.MONGODB_DB_NAME;
        else process.env.MONGODB_DB_NAME = previousDbName;
    });

    t.mock.method(MongoClient.prototype, "connect", async () => {
        throw new Error("MongoDB unreachable");
    });
    t.mock.method(MongoClient.prototype, "close", async () => undefined);

    const fastify = Fastify({ logger: false });
    t.after(() => fastify.close());

    await fastify.register(MongoDb);
    await fastify.ready();

    assert.equal(fastify.mongoClient, null);
    assert.equal(fastify.mongoDb, null);
    assert.equal(fastify.mongoBucket, null);
    assert.equal(fastify.mongoVideoBucket, null);
    assert.equal(fastify.imageStorage.isConfigured(), false);
});
