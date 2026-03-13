import { test } from "node:test";
import * as assert from "node:assert";

import Fastify from "fastify";
import Support from "../../src/plugins/support";

test("support works standalone", async (_t) => {
    const fastify = Fastify();
    fastify.register(Support);
    await fastify.ready();

    assert.equal(typeof fastify.getNow(), "string");
});
