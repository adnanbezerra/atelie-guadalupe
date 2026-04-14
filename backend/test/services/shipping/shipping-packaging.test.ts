import * as assert from "node:assert";
import { test } from "node:test";
import { buildPackagingPlan } from "../../../src/modules/shipping/services/shipping-packaging";

const boxes = [
    {
        uuid: "box-small",
        name: "Caixa Pequena",
        slug: "caixa-pequena",
        category: "SELFCARE" as const,
        outerHeightCm: 11.5,
        outerWidthCm: 6.5,
        outerLengthCm: 6.5,
        emptyWeightGrams: 0,
        maxItems: 2
    },
    {
        uuid: "box-large",
        name: "Caixa Grande",
        slug: "caixa-grande",
        category: "SELFCARE" as const,
        outerHeightCm: 21,
        outerWidthCm: 12.5,
        outerLengthCm: 12.5,
        emptyWeightGrams: 0,
        maxItems: 4
    },
    {
        uuid: "box-art",
        name: "Caixa Artesanato",
        slug: "caixa-artesanato",
        category: "ARTISANAL" as const,
        outerHeightCm: 95,
        outerWidthCm: 50,
        outerLengthCm: 17,
        emptyWeightGrams: 0,
        maxItems: 1
    }
];

test("packaging chooses one large and one small box for five selfcare items", () => {
    const packaging = buildPackagingPlan(
        [
            {
                uuid: "item-1",
                productSize: "GRAMS_70",
                quantity: 5,
                productNameSnapshot: "Hidrapele",
                unitPriceInCents: 1190,
                product: {
                    category: "SELFCARE",
                    shippingWeightGrams: null
                }
            }
        ],
        boxes
    );

    assert.equal(packaging.selectedBoxes.length, 2);
    assert.deepStrictEqual(
        packaging.selectedBoxes.map((item) => [item.boxSlug, item.quantity]),
        [
            ["caixa-grande", 1],
            ["caixa-pequena", 1]
        ]
    );
    assert.equal(packaging.consolidatedPackage.heightCm, 21);
    assert.equal(packaging.consolidatedPackage.widthCm, 12.5);
    assert.equal(packaging.consolidatedPackage.lengthCm, 19);
    assert.equal(packaging.consolidatedPackage.weightKg, 0.49);
});

test("packaging uses the dedicated artisanal box and configured product weight", () => {
    const packaging = buildPackagingPlan(
        [
            {
                uuid: "item-1",
                productSize: "GRAMS_100",
                quantity: 1,
                productNameSnapshot: "Crucifixo",
                unitPriceInCents: 25990,
                product: {
                    category: "ARTISANAL",
                    shippingWeightGrams: 5000
                }
            }
        ],
        boxes
    );

    assert.deepStrictEqual(
        packaging.selectedBoxes.map((item) => [item.boxSlug, item.quantity]),
        [["caixa-artesanato", 1]]
    );
    assert.equal(packaging.consolidatedPackage.heightCm, 95);
    assert.equal(packaging.consolidatedPackage.widthCm, 50);
    assert.equal(packaging.consolidatedPackage.lengthCm, 17);
    assert.equal(packaging.consolidatedPackage.weightKg, 5);
});
