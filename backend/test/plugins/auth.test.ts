import { test } from "node:test";
import * as assert from "node:assert";

import Fastify from "fastify";
import jwt from "@fastify/jwt";
import Auth from "../../src/plugins/auth";
import Support from "../../src/plugins/support";

test("authenticate returns 401 when access token is expired", async (_t) => {
    const fastify = Fastify();

    await fastify.register(Support);
    await fastify.register(jwt, {
        secret: "test-secret"
    });
    await fastify.register(Auth);

    fastify.get(
        "/private",
        {
            preHandler: [fastify.authenticate]
        },
        async () => ({ success: true })
    );

    await fastify.ready();
    _t.after(() => fastify.close());

    const expiredToken = fastify.jwt.sign({
        sub: "user-uuid",
        email: "user@example.com",
        role: "USER",
        name: "User",
        exp: Math.floor(Date.now() / 1000) - 60
    });

    const response = await fastify.inject({
        method: "GET",
        url: "/private",
        headers: {
            authorization: `Bearer ${expiredToken}`
        }
    });

    assert.equal(response.statusCode, 401);
    assert.deepEqual(response.json(), {
        success: false,
        error: {
            code: "UNAUTHORIZED",
            message: "Access token expirado",
            details: []
        }
    });
});
