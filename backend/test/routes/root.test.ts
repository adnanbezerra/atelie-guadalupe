import { test } from "node:test";
import * as assert from "node:assert";
import { build } from "../helper";

test("default root route", async (t) => {
    const app = await build(t);

    const res = await app.inject({
        url: "/"
    });
    const payload = JSON.parse(res.payload);

    assert.equal(payload.success, true);
    assert.equal(payload.data.service, "atelie-guadalupe-backend");
    assert.equal(payload.data.status, "ok");
    assert.equal(typeof payload.data.timestamp, "string");
});
