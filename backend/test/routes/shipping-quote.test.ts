import * as assert from "node:assert";
import { test } from "node:test";
import "../../src/plugins/auth";
import "../../src/plugins/prisma";
import "../../src/plugins/zod";
import shippingRoutes from "../../src/modules/shipping/routes/shipping-routes";
import { quoteCartShippingSchema } from "../../src/modules/shipping/schemas/shipping-schema";

test("cart shipping quote route is registered without authentication", async () => {
    const registeredPosts: Array<{ path: string; options?: unknown }> = [];
    const fastify = {
        prisma: {},
        authenticate: async () => undefined,
        authorize: () => async () => undefined,
        get: () => undefined,
        post: (path: string, optionsOrHandler: unknown, handler?: unknown) => {
            registeredPosts.push({
                path,
                options: handler ? optionsOrHandler : undefined
            });
        },
        patch: () => undefined,
        delete: () => undefined
    };

    await shippingRoutes(fastify as never, {});

    assert.deepEqual(
        registeredPosts.find((route) => route.path === "/quote"),
        {
            path: "/quote",
            options: undefined
        }
    );
});

test("cart shipping quote schema rejects invalid zip codes and empty carts", () => {
    const result = quoteCartShippingSchema.safeParse({
        zipCode: "123",
        items: []
    });

    assert.equal(result.success, false);
});
