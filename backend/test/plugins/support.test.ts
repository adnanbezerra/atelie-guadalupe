import { test } from "node:test";
import * as assert from "node:assert";

import Fastify from "fastify";
import Support from "../../src/plugins/support";
import RateLimit from "../../src/plugins/rate-limit";

test("support works standalone", async (_t) => {
    const fastify = Fastify();
    fastify.register(Support);
    await fastify.ready();

    assert.equal(typeof fastify.getNow(), "string");
});

test("rate limit returns a stable 429 response for the frontend", async (t) => {
    const fastify = Fastify();
    t.after(() => fastify.close());
    await fastify.register(Support);
    await fastify.register(RateLimit);
    fastify.post(
        "/limited",
        {
            config: {
                rateLimit: {
                    max: 1,
                    timeWindow: "1 minute"
                }
            }
        },
        async () => ({ success: true })
    );
    await fastify.ready();

    const request = { method: "POST" as const, url: "/limited", remoteAddress: "10.0.0.1" };
    assert.equal((await fastify.inject(request)).statusCode, 200);

    const response = await fastify.inject(request);

    assert.equal(response.statusCode, 429);
    assert.equal(response.headers["x-ratelimit-remaining"], "0");
    assert.ok(response.headers["retry-after"]);
    assert.deepEqual(response.json(), {
        success: false,
        error: {
            code: "RATE_LIMIT_EXCEEDED",
            message: "Muitas tentativas. Tente novamente mais tarde.",
            details: [
                {
                    limit: 1,
                    timeWindow: "1 minute"
                }
            ]
        }
    });
});
