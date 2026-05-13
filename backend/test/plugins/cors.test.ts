import { test } from "node:test";
import * as assert from "node:assert";

import Fastify from "fastify";
import Cors from "../../src/plugins/cors";

test("cors allows origins configured as a comma separated list", async (t) => {
    const previousCorsOrigin = process.env.CORS_ORIGIN;
    process.env.CORS_ORIGIN =
        "https://atelie-guadalupe.ithx86.easypanel.host, https://atelieguadalupe.com.br";

    t.after(() => {
        process.env.CORS_ORIGIN = previousCorsOrigin;
    });

    const fastify = Fastify();
    await fastify.register(Cors);

    fastify.get("/cors-test", async () => ({ success: true }));

    await fastify.ready();
    t.after(() => fastify.close());

    const allowedResponse = await fastify.inject({
        method: "OPTIONS",
        url: "/cors-test",
        headers: {
            origin: "https://atelieguadalupe.com.br",
            "access-control-request-method": "GET"
        }
    });

    assert.equal(
        allowedResponse.headers["access-control-allow-origin"],
        "https://atelieguadalupe.com.br"
    );

    const blockedResponse = await fastify.inject({
        method: "OPTIONS",
        url: "/cors-test",
        headers: {
            origin: "https://example.com",
            "access-control-request-method": "GET"
        }
    });

    assert.equal(blockedResponse.headers["access-control-allow-origin"], undefined);
});
