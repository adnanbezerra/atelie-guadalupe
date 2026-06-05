import * as assert from "node:assert";
import { test } from "node:test";
import { normalizePublicMediaUrl } from "../../../src/core/storage/media-url";

test("normalizePublicMediaUrl converts localhost media URL to relative path", () => {
    assert.equal(
        normalizePublicMediaUrl("http://localhost:80/media/images/507f1f77bcf86cd799439011"),
        "/media/images/507f1f77bcf86cd799439011"
    );
});

test("normalizePublicMediaUrl keeps external URLs unchanged", () => {
    assert.equal(
        normalizePublicMediaUrl("https://api.exemplo.com/media/images/507f1f77bcf86cd799439011"),
        "https://api.exemplo.com/media/images/507f1f77bcf86cd799439011"
    );
});
