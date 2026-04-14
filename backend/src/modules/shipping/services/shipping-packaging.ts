import { ProductCategory, ProductSize } from "../../../generated/prisma/enums";
import { AppError } from "../../../core/errors/app-error";
import { getProductSizeInGrams } from "../../products/services/product-pricing";

const SELFCARE_JAR_TARE_GRAMS = 28;
const MAX_PACKAGE_WEIGHT_KG = 30;
const MAX_PACKAGE_SIDE_CM = 100;
const MAX_PACKAGE_SUM_CM = 200;

type PackagingBox = {
    uuid: string;
    name: string;
    slug: string;
    category: ProductCategory;
    outerHeightCm: unknown;
    outerWidthCm: unknown;
    outerLengthCm: unknown;
    emptyWeightGrams: number;
    maxItems: number;
};

type PackagingOrderItem = {
    uuid: string;
    productSize: ProductSize;
    quantity: number;
    productNameSnapshot: string;
    unitPriceInCents: number;
    product: {
        category: ProductCategory;
        shippingWeightGrams: number | null;
    } | null;
};

type SelectedBox = {
    boxUuid: string;
    boxName: string;
    boxSlug: string;
    category: ProductCategory;
    quantity: number;
    maxItemsPerBox: number;
    dimensionsCm: {
        height: number;
        width: number;
        length: number;
    };
    emptyWeightGrams: number;
    totalCapacity: number;
};

type Combination = {
    totalBoxes: number;
    totalCapacity: number;
    totalVolume: number;
    selectedBoxes: SelectedBox[];
};

function toNumber(value: unknown) {
    return Number(value);
}

function compareCombinations(
    current: Combination | null,
    candidate: Combination | null,
    requiredItems: number
) {
    if (!candidate) {
        return current;
    }

    if (!current) {
        return candidate;
    }

    const currentOverflow = current.totalCapacity - requiredItems;
    const candidateOverflow = candidate.totalCapacity - requiredItems;

    if (candidate.totalBoxes !== current.totalBoxes) {
        return candidate.totalBoxes < current.totalBoxes ? candidate : current;
    }

    if (candidateOverflow !== currentOverflow) {
        return candidateOverflow < currentOverflow ? candidate : current;
    }

    return candidate.totalVolume < current.totalVolume ? candidate : current;
}

function selectBoxes(requiredItems: number, boxes: PackagingBox[]): Combination | null {
    if (requiredItems <= 0) {
        return {
            totalBoxes: 0,
            totalCapacity: 0,
            totalVolume: 0,
            selectedBoxes: []
        };
    }

    const sortedBoxes = [...boxes].sort((left, right) => right.maxItems - left.maxItems);
    const memo = new Map<string, Combination | null>();

    const search = (index: number, remainingItems: number): Combination | null => {
        const memoKey = `${index}:${remainingItems}`;
        if (memo.has(memoKey)) {
            return memo.get(memoKey) ?? null;
        }

        if (remainingItems <= 0) {
            const result = {
                totalBoxes: 0,
                totalCapacity: 0,
                totalVolume: 0,
                selectedBoxes: []
            };
            memo.set(memoKey, result);
            return result;
        }

        const box = sortedBoxes[index];
        if (!box) {
            memo.set(memoKey, null);
            return null;
        }

        let bestCombination: Combination | null = null;
        const maxCount = Math.ceil(remainingItems / box.maxItems) + 1;

        for (let count = 0; count <= maxCount; count += 1) {
            const next = search(index + 1, remainingItems - count * box.maxItems);
            if (!next) {
                continue;
            }

            const boxHeight = toNumber(box.outerHeightCm);
            const boxWidth = toNumber(box.outerWidthCm);
            const boxLength = toNumber(box.outerLengthCm);

            const currentSelection =
                count === 0
                    ? []
                    : [
                          {
                              boxUuid: box.uuid,
                              boxName: box.name,
                              boxSlug: box.slug,
                              category: box.category,
                              quantity: count,
                              maxItemsPerBox: box.maxItems,
                              dimensionsCm: {
                                  height: boxHeight,
                                  width: boxWidth,
                                  length: boxLength
                              },
                              emptyWeightGrams: box.emptyWeightGrams,
                              totalCapacity: count * box.maxItems
                          }
                      ];

            const candidate: Combination = {
                totalBoxes: next.totalBoxes + count,
                totalCapacity: next.totalCapacity + count * box.maxItems,
                totalVolume: next.totalVolume + count * boxHeight * boxWidth * boxLength,
                selectedBoxes: [...currentSelection, ...next.selectedBoxes]
            };

            bestCombination = compareCombinations(bestCombination, candidate, requiredItems);
        }

        memo.set(memoKey, bestCombination);
        return bestCombination;
    };

    return search(0, requiredItems);
}

function calculateSelfcareWeightInGrams(item: PackagingOrderItem) {
    return (getProductSizeInGrams(item.productSize) + SELFCARE_JAR_TARE_GRAMS) * item.quantity;
}

function calculateArtisanalWeightInGrams(item: PackagingOrderItem) {
    if (!item.product?.shippingWeightGrams) {
        throw AppError.business(
            `Produto artesanal sem peso logistico configurado: ${item.productNameSnapshot}`
        );
    }

    return item.product.shippingWeightGrams * item.quantity;
}

export function buildPackagingPlan(items: PackagingOrderItem[], boxes: PackagingBox[]) {
    if (items.length === 0) {
        throw AppError.business("Nao e possivel calcular frete sem itens no pedido");
    }

    const selfcareItems = items.filter((item) => item.product?.category === "SELFCARE");
    const artisanalItems = items.filter((item) => item.product?.category === "ARTISANAL");
    const unsupportedItems = items.filter((item) => !item.product);

    if (unsupportedItems.length > 0) {
        throw AppError.business(
            "Existem itens no pedido sem cadastro de produto para calcular o frete"
        );
    }

    const selfcareBoxes = boxes.filter((box) => box.category === "SELFCARE");
    const artisanalBoxes = boxes.filter((box) => box.category === "ARTISANAL");

    const selfcareUnits = selfcareItems.reduce((total, item) => total + item.quantity, 0);
    const artisanalUnits = artisanalItems.reduce((total, item) => total + item.quantity, 0);

    const selectedGroups: SelectedBox[] = [];

    if (selfcareUnits > 0) {
        if (selfcareBoxes.length === 0) {
            throw AppError.business("Nao existem caixas ativas para produtos SELFCARE");
        }

        const combination = selectBoxes(selfcareUnits, selfcareBoxes);
        if (!combination) {
            throw AppError.business("Nao foi possivel montar as caixas para produtos SELFCARE");
        }

        selectedGroups.push(...combination.selectedBoxes);
    }

    if (artisanalUnits > 0) {
        if (artisanalBoxes.length === 0) {
            throw AppError.business("Nao existem caixas ativas para produtos ARTISANAL");
        }

        const combination = selectBoxes(artisanalUnits, artisanalBoxes);
        if (!combination) {
            throw AppError.business("Nao foi possivel montar as caixas para produtos ARTISANAL");
        }

        selectedGroups.push(...combination.selectedBoxes);
    }

    const flattenedBoxes = selectedGroups.flatMap((group) => {
        return Array.from({ length: group.quantity }).map(() => ({
            ...group.dimensionsCm,
            category: group.category,
            emptyWeightGrams: group.emptyWeightGrams
        }));
    });

    const itemsWeightGrams = items.reduce((total, item) => {
        if (item.product?.category === "SELFCARE") {
            return total + calculateSelfcareWeightInGrams(item);
        }

        return total + calculateArtisanalWeightInGrams(item);
    }, 0);

    const boxesWeightGrams = flattenedBoxes.reduce((total, box) => total + box.emptyWeightGrams, 0);

    const consolidatedPackage = {
        heightCm: flattenedBoxes.reduce((max, box) => Math.max(max, box.height), 0),
        widthCm: flattenedBoxes.reduce((max, box) => Math.max(max, box.width), 0),
        lengthCm: flattenedBoxes.reduce((total, box) => total + box.length, 0),
        weightKg: Number(((itemsWeightGrams + boxesWeightGrams) / 1000).toFixed(3))
    };

    if (
        consolidatedPackage.heightCm > MAX_PACKAGE_SIDE_CM ||
        consolidatedPackage.widthCm > MAX_PACKAGE_SIDE_CM ||
        consolidatedPackage.lengthCm > MAX_PACKAGE_SIDE_CM
    ) {
        throw AppError.business(
            "As dimensoes consolidadas do pacote excedem o limite suportado pela integracao"
        );
    }

    if (
        consolidatedPackage.heightCm + consolidatedPackage.widthCm + consolidatedPackage.lengthCm >
        MAX_PACKAGE_SUM_CM
    ) {
        throw AppError.business(
            "A soma dos lados do pacote excede o limite suportado pela integracao"
        );
    }

    if (consolidatedPackage.weightKg > MAX_PACKAGE_WEIGHT_KG) {
        throw AppError.business("O peso do pacote excede o limite suportado pela integracao");
    }

    return {
        selectedBoxes: selectedGroups,
        itemCounts: {
            selfcareUnits,
            artisanalUnits,
            totalUnits: selfcareUnits + artisanalUnits
        },
        consolidatedPackage,
        itemsWeightGrams,
        boxesWeightGrams
    };
}
