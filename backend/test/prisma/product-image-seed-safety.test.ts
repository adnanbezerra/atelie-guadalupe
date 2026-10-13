import * as assert from "node:assert";
import { readFile } from "node:fs/promises";
import { test } from "node:test";
import * as path from "node:path";

const seedFiles = ["prisma/seed.ts", "prisma/update-product-seed-data.ts"];

test("product seeds never generate unsupported legacy media paths", async () => {
    for (const relativePath of seedFiles) {
        const source = await readFile(path.resolve(relativePath), "utf8");

        assert.doesNotMatch(source, /\/media\/products\//, relativePath);
    }
});
