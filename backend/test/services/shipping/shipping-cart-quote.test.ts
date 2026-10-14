import * as assert from "node:assert";
import { test } from "node:test";
import { AppError } from "../../../src/core/errors/app-error";
import { ShippingService } from "../../../src/modules/shipping/services/shipping-service";

const productUuid = "0195f4aa-7f18-7db5-9f32-06f4a9a2b401";

function createPlatform() {
    return {
        uuid: "0195f4aa-7f18-7db5-9f32-06f4a9a2b101",
        name: "Atelie Guadalupe",
        slug: "atelie-guadalupe",
        email: "contato@atelie.com",
        phone: null,
        document: "12345678000199",
        websiteUrl: "https://atelie.example.com",
        address: {
            document: "12345678000199",
            zipCode: "01153000",
            street: "Rua da Origem",
            number: "123",
            complement: null,
            neighborhood: "Centro",
            city: "Sao Paulo",
            state: "SP",
            country: "Brasil"
        }
    };
}

function createProduct(
    overrides: {
        category?: "SELFCARE" | "ARTISANAL";
        stock?: number | null;
        shippingWeightGrams?: number | null;
        isActive?: boolean;
    } = {}
) {
    return {
        id: 1,
        uuid: productUuid,
        lineId: 1,
        category: "SELFCARE" as const,
        name: "Hidrapele",
        slug: "hidrapele",
        imageUrl: "/hidrapele.webp",
        stock: null,
        shippingWeightGrams: null,
        description: null,
        shortDescription: "Descricao curta",
        longDescription: "Descricao longa",
        isActive: true,
        createdAt: new Date(),
        updatedAt: new Date(),
        line: {
            id: 1,
            uuid: "0195f4aa-7f18-7db5-9f32-06f4a9a2b402",
            name: "Hidratantes",
            slug: "hidratantes",
            price70gInCents: 3000,
            price100gInCents: 4000,
            createdAt: new Date(),
            updatedAt: new Date()
        },
        ...overrides
    };
}

function createSelfcareBox() {
    return {
        uuid: "0195f4aa-7f18-7db5-9f32-06f4a9a2b403",
        name: "Caixa Pequena",
        slug: "caixa-pequena",
        category: "SELFCARE" as const,
        outerHeightCm: "11.50",
        outerWidthCm: "6.50",
        outerLengthCm: "6.50",
        emptyWeightGrams: 30,
        maxItems: 2,
        updatedAt: new Date("2026-01-01T00:00:00.000Z")
    };
}

test("cart shipping quote uses backend product data and does not persist a shipment", async () => {
    let calculatorPayload: unknown;
    const service = new ShippingService(
        {
            listActiveBoxes: async () => [createSelfcareBox()]
        } as never,
        {
            findDefaultActive: async () => createPlatform()
        } as never,
        {
            calculateQuote: async (payload: unknown) => {
                calculatorPayload = payload;
                return [
                    {
                        id: 1,
                        name: "PAC",
                        price: 35.26,
                        delivery_time: 7
                    }
                ];
            }
        } as never,
        {
            findByUuid: async () => createProduct()
        } as never
    );

    const result = await service.quoteCart({
        zipCode: "01001000",
        items: [
            {
                productUuid,
                productSize: "GRAMS_70",
                quantity: 1
            }
        ]
    });

    assert.deepEqual(result, {
        success: true,
        value: {
            quotedServices: [
                {
                    serviceCode: 1,
                    serviceName: "PAC",
                    priceInCents: 3526,
                    deliveryDays: 7,
                    deliveryRange: {
                        min: null,
                        max: null
                    }
                }
            ],
            deliveryOptions: [
                {
                    id: "local-pickup",
                    type: "LOCAL_PICKUP",
                    name: "Retirada na loja",
                    priceInCents: 0,
                    location: {
                        name: "Atelie Guadalupe",
                        street: "Rua da Origem",
                        number: "123",
                        complement: null,
                        neighborhood: "Centro",
                        city: "Sao Paulo",
                        state: "SP",
                        zipCode: "01153000"
                    }
                },
                {
                    id: "shipping-1",
                    type: "SHIPMENT",
                    serviceCode: 1,
                    name: "PAC",
                    priceInCents: 3526,
                    deliveryDays: 7,
                    deliveryRange: {
                        min: null,
                        max: null
                    }
                }
            ]
        }
    });
    assert.deepEqual(calculatorPayload, {
        from: {
            postal_code: "01153000"
        },
        to: {
            postal_code: "01001000"
        },
        services: process.env.SUPERFRETE_SERVICE_CODES ?? "1,2,17",
        options: {
            own_hand: false,
            receipt: false,
            insurance_value: 30,
            use_insurance_value: false
        },
        package: {
            height: 11.5,
            width: 6.5,
            length: 6.5,
            weight: 0.128
        }
    });
});

test("order shipping preparation confirms the selected current quote", async () => {
    const service = new ShippingService(
        {
            listActiveBoxes: async () => [createSelfcareBox()]
        } as never,
        {
            findDefaultActive: async () => createPlatform()
        } as never,
        {
            calculateQuote: async () => [
                {
                    id: 1,
                    name: "PAC",
                    price: 35.26,
                    delivery_time: 7
                }
            ]
        } as never,
        {} as never
    );

    const result = await service.prepareOrderShipping({
        orderUuid: "0195f4aa-7f18-7db5-9f32-06f4a9a2b404",
        addressUuid: "0195f4aa-7f18-7db5-9f32-06f4a9a2b405",
        destinationZipCode: "01001000",
        subtotalInCents: 3000,
        serviceCode: 1,
        expectedPriceInCents: 3526,
        items: [
            {
                uuid: "0195f4aa-7f18-7db5-9f32-06f4a9a2b406",
                productId: 1,
                productSize: "GRAMS_70",
                quantity: 1,
                productNameSnapshot: "Hidrapele",
                unitPriceInCents: 3000,
                totalPriceInCents: 3000,
                product: {
                    category: "SELFCARE",
                    shippingWeightGrams: null
                }
            }
        ]
    });

    assert.equal(result.success, true);
    if (result.success) {
        assert.equal(result.value.shippingInCents, 3526);
        assert.equal(result.value.serviceName, "PAC");
        assert.equal(result.value.shipment.status, "CONFIRMED");
        assert.equal(result.value.shipment.selectedServiceCode, 1);
    }
});

test("order shipping preparation rejects a changed quote price", async () => {
    const service = new ShippingService(
        {
            listActiveBoxes: async () => [createSelfcareBox()]
        } as never,
        {
            findDefaultActive: async () => createPlatform()
        } as never,
        {
            calculateQuote: async () => [{ id: 1, name: "PAC", price: 35.26 }]
        } as never,
        {} as never
    );

    const result = await service.prepareOrderShipping({
        orderUuid: "0195f4aa-7f18-7db5-9f32-06f4a9a2b404",
        addressUuid: "0195f4aa-7f18-7db5-9f32-06f4a9a2b405",
        destinationZipCode: "01001000",
        subtotalInCents: 3000,
        serviceCode: 1,
        expectedPriceInCents: 3000,
        items: [
            {
                uuid: "0195f4aa-7f18-7db5-9f32-06f4a9a2b406",
                productId: 1,
                productSize: "GRAMS_70",
                quantity: 1,
                productNameSnapshot: "Hidrapele",
                unitPriceInCents: 3000,
                totalPriceInCents: 3000,
                product: {
                    category: "SELFCARE",
                    shippingWeightGrams: null
                }
            }
        ]
    });

    assert.equal(result.success, false);
    if (!result.success) {
        assert.equal(result.value.code, "CONFLICT");
        assert.equal(result.value.statusCode, 409);
    }
});

test("order shipping preparation rejects an unconfigured service", async () => {
    let calculatorCalled = false;
    const service = new ShippingService(
        { listActiveBoxes: async () => [createSelfcareBox()] } as never,
        { findDefaultActive: async () => createPlatform() } as never,
        {
            calculateQuote: async () => {
                calculatorCalled = true;
                return [];
            }
        } as never,
        {} as never
    );

    const result = await service.prepareOrderShipping({
        orderUuid: "0195f4aa-7f18-7db5-9f32-06f4a9a2b404",
        addressUuid: "0195f4aa-7f18-7db5-9f32-06f4a9a2b405",
        destinationZipCode: "01001000",
        subtotalInCents: 3000,
        serviceCode: 999,
        expectedPriceInCents: 1000,
        items: []
    });

    assert.equal(result.success, false);
    assert.equal(calculatorCalled, false);
    if (!result.success) {
        assert.equal(result.value.code, "RESOURCE_NOT_FOUND");
        assert.equal(result.value.statusCode, 404);
    }
});

test("cart shipping quote returns not found for a missing product", async () => {
    const service = new ShippingService(
        {
            listActiveBoxes: async () => {
                throw new Error("boxes should not be loaded");
            }
        } as never,
        {} as never,
        {} as never,
        {
            findByUuid: async () => null
        } as never
    );

    const result = await service.quoteCart({
        zipCode: "01001000",
        items: [{ productUuid, productSize: "GRAMS_70", quantity: 1 }]
    });

    assert.equal(result.success, false);
    if (!result.success) {
        assert.equal(result.value.code, "RESOURCE_NOT_FOUND");
        assert.equal(result.value.statusCode, 404);
    }
});

test("cart shipping quote validates aggregated stock for repeated products", async () => {
    let productLookups = 0;
    const service = new ShippingService(
        {
            listActiveBoxes: async () => {
                throw new Error("boxes should not be loaded");
            }
        } as never,
        {} as never,
        {} as never,
        {
            findByUuid: async () => {
                productLookups += 1;
                return createProduct({
                    category: "ARTISANAL",
                    stock: 1,
                    shippingWeightGrams: 200
                });
            }
        } as never
    );

    const result = await service.quoteCart({
        zipCode: "01001000",
        items: [
            { productUuid, productSize: "GRAMS_70", quantity: 1 },
            { productUuid, productSize: "GRAMS_100", quantity: 1 }
        ]
    });

    assert.equal(productLookups, 1);
    assert.equal(result.success, false);
    if (!result.success) {
        assert.equal(result.value.code, "VALIDATION_ERROR");
        assert.equal(result.value.statusCode, 422);
    }
});

test("cart shipping quote returns local pickup when no carrier is available", async () => {
    const service = new ShippingService(
        {
            listActiveBoxes: async () => [createSelfcareBox()]
        } as never,
        {
            findDefaultActive: async () => createPlatform()
        } as never,
        {
            calculateQuote: async () => []
        } as never,
        {
            findByUuid: async () => createProduct()
        } as never
    );

    const result = await service.quoteCart({
        zipCode: "01001000",
        items: [{ productUuid, productSize: "GRAMS_70", quantity: 1 }]
    });

    assert.equal(result.success, true);
    if (result.success) {
        assert.deepEqual(result.value.quotedServices, []);
        assert.equal(result.value.deliveryOptions.length, 1);
        assert.equal(result.value.deliveryOptions[0].type, "LOCAL_PICKUP");
    }
});

test("cart shipping quote keeps local pickup when SuperFrete is unavailable", async () => {
    const service = new ShippingService(
        {
            listActiveBoxes: async () => [createSelfcareBox()]
        } as never,
        {
            findDefaultActive: async () => createPlatform()
        } as never,
        {
            calculateQuote: async () => {
                throw AppError.serviceUnavailable("token=secret internal response");
            }
        } as never,
        {
            findByUuid: async () => createProduct()
        } as never
    );

    const result = await service.quoteCart({
        zipCode: "01001000",
        items: [{ productUuid, productSize: "GRAMS_70", quantity: 1 }]
    });

    assert.equal(result.success, true);
    if (result.success) {
        assert.deepEqual(result.value.quotedServices, []);
        assert.equal(result.value.deliveryOptions[0].type, "LOCAL_PICKUP");
    }
});

test("local pickup preparation returns not found without a configured location", async () => {
    const service = new ShippingService(
        {} as never,
        { findDefaultActive: async () => null } as never,
        {} as never,
        {} as never
    );

    const result = await service.prepareLocalPickup();

    assert.equal(result.success, false);
    if (!result.success) {
        assert.equal(result.value.code, "RESOURCE_NOT_FOUND");
        assert.equal(result.value.statusCode, 404);
    }
});
