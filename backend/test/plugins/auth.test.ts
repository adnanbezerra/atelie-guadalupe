import { test } from "node:test";
import * as assert from "node:assert";

import Fastify from "fastify";
import jwt from "@fastify/jwt";
import Auth from "../../src/plugins/auth";
import Support from "../../src/plugins/support";

function authPrisma(authVersion = 0, isActive = true) {
    return {
        user: {
            findUnique: async () => ({ authVersion, isActive })
        }
    };
}

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

test("authenticate accepts a legacy token for auth version zero", async (_t) => {
    const fastify = Fastify();
    fastify.decorate("prisma", authPrisma() as never);
    await fastify.register(Support);
    await fastify.register(jwt, { secret: "test-secret" });
    await fastify.register(Auth);
    fastify.get("/private", { preHandler: [fastify.authenticate] }, async () => ({
        success: true
    }));
    await fastify.ready();
    _t.after(() => fastify.close());

    const token = fastify.jwt.sign({
        sub: "0195f4aa-7f18-7db5-9f32-06f4a9a2b101",
        email: "user@example.com",
        role: "USER",
        name: "User"
    });
    const response = await fastify.inject({
        method: "GET",
        url: "/private",
        headers: { authorization: `Bearer ${token}` }
    });

    assert.equal(response.statusCode, 200);
});

test("authenticate rejects a token with an old auth version", async (_t) => {
    const fastify = Fastify();
    fastify.decorate("prisma", authPrisma(1) as never);
    await fastify.register(Support);
    await fastify.register(jwt, { secret: "test-secret" });
    await fastify.register(Auth);
    fastify.get("/private", { preHandler: [fastify.authenticate] }, async () => ({
        success: true
    }));
    await fastify.ready();
    _t.after(() => fastify.close());

    const token = fastify.jwt.sign({
        sub: "0195f4aa-7f18-7db5-9f32-06f4a9a2b101",
        email: "user@example.com",
        role: "USER",
        name: "User",
        authVersion: 0
    });
    const response = await fastify.inject({
        method: "GET",
        url: "/private",
        headers: { authorization: `Bearer ${token}` }
    });

    assert.equal(response.statusCode, 401);
    assert.equal(response.json().error.message, "Access token invalido");
});

test("optional authentication accepts public requests and loads a supplied token", async (_t) => {
    const fastify = Fastify();
    fastify.decorate("prisma", authPrisma() as never);
    await fastify.register(Support);
    await fastify.register(jwt, { secret: "test-secret" });
    await fastify.register(Auth);
    fastify.get("/optional", { preHandler: [fastify.authenticateOptional] }, async (request) => ({
        role: request.currentUser?.role ?? null
    }));
    await fastify.ready();
    _t.after(() => fastify.close());

    const publicResponse = await fastify.inject({ method: "GET", url: "/optional" });
    const token = fastify.jwt.sign({
        sub: "0195f4aa-7f18-7db5-9f32-06f4a9a2b101",
        email: "admin@example.com",
        role: "ADMIN",
        name: "Admin"
    });
    const adminResponse = await fastify.inject({
        method: "GET",
        url: "/optional",
        headers: { authorization: `Bearer ${token}` }
    });

    assert.equal(publicResponse.statusCode, 200);
    assert.equal(publicResponse.json().role, null);
    assert.equal(adminResponse.statusCode, 200);
    assert.equal(adminResponse.json().role, "ADMIN");
});
