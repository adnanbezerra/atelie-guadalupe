import * as assert from "node:assert";
import { PassThrough } from "node:stream";
import { test } from "node:test";
import Fastify from "fastify";
import { loggerOptions, serializeRequestForLog } from "../../src/config/logger";

test("request log serializer removes query parameters and webhook secret", () => {
    const secret = "highly-sensitive-webhook-secret";
    const serialized = serializeRequestForLog({
        method: "POST",
        url: `/webhooks/abacatepay?webhookSecret=${secret}&retry=true`,
        hostname: "api.example.com",
        ip: "203.0.113.10"
    });
    const logOutput = JSON.stringify(serialized);

    assert.equal(serialized.url, "/webhooks/abacatepay");
    assert.equal(logOutput.includes(secret), false);
    assert.equal(logOutput.includes("webhookSecret"), false);
    assert.equal(logOutput.includes("retry=true"), false);
});

test("logger configuration redacts authentication headers", () => {
    assert.deepEqual(loggerOptions.redact.paths, [
        "req.headers.authorization",
        "req.headers.cookie",
        'req.headers["x-webhook-signature"]',
        "headers.authorization",
        "headers.cookie",
        'headers["x-webhook-signature"]'
    ]);
});

test("Fastify automatic request log never writes query secrets", async () => {
    const output: string[] = [];
    const stream = new PassThrough();
    stream.on("data", (chunk) => output.push(chunk.toString()));
    const fastify = Fastify({ logger: { ...loggerOptions, stream } });
    fastify.post("/webhooks/abacatepay", async () => ({ success: true }));
    const secret = "must-not-reach-log-output";

    try {
        await fastify.inject({
            method: "POST",
            url: `/webhooks/abacatepay?webhookSecret=${secret}`
        });
    } finally {
        await fastify.close();
    }

    const logs = output.join("");
    assert.equal(logs.includes(secret), false);
    assert.equal(logs.includes("webhookSecret"), false);
    assert.equal(logs.includes('"url":"/webhooks/abacatepay"'), true);
});
