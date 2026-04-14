import * as assert from "node:assert";
import { test } from "node:test";
import { ShippingService } from "../../../src/modules/shipping/services/shipping-service";

function createPlatform() {
    return {
        id: 1,
        uuid: "platform-1",
        name: "Atelie Guadalupe",
        slug: "atelie-guadalupe",
        email: "contato@atelie.com",
        phone: null,
        document: "12345678000199",
        websiteUrl: "http://localhost:3000",
        isActive: true,
        isDefault: true,
        createdAt: new Date(),
        updatedAt: new Date(),
        address: {
            id: 10,
            uuid: "platform-address-1",
            userId: null,
            platformId: 1,
            label: "Plataforma",
            recipient: "Atelie Guadalupe",
            document: "12345678000199",
            zipCode: "01153000",
            street: "Rua da Origem",
            number: "123",
            complement: null,
            neighborhood: "Centro",
            city: "Sao Paulo",
            state: "SP",
            country: "Brasil",
            reference: null,
            isDefault: false,
            createdAt: new Date(),
            updatedAt: new Date()
        }
    };
}

function createConfirmedOrder() {
    return {
        id: 1,
        uuid: "order-1",
        userId: 1,
        addressId: 1,
        status: "PENDING" as const,
        subtotalInCents: 10000,
        shippingInCents: 1590,
        discountInCents: 0,
        totalInCents: 11590,
        notes: null,
        checkoutProvider: null,
        checkoutReference: null,
        placedAt: new Date(),
        createdAt: new Date(),
        updatedAt: new Date(),
        address: {
            uuid: "address-1",
            recipient: "Maria Silva",
            document: "12345678901",
            zipCode: "01001000",
            street: "Rua A",
            number: "10",
            complement: null,
            neighborhood: "Centro",
            city: "Sao Paulo",
            state: "SP",
            country: "Brasil",
            reference: null,
            isDefault: true,
            createdAt: new Date(),
            updatedAt: new Date(),
            userId: 1,
            id: 1,
            label: null
        },
        items: [],
        user: {
            id: 1,
            uuid: "user-1",
            name: "Maria",
            email: "maria@example.com",
            document: "12345678901",
            passwordHash: "hash",
            isActive: true,
            roleId: 1,
            createdAt: new Date(),
            updatedAt: new Date(),
            role: {
                id: 1,
                name: "USER" as const,
                createdAt: new Date(),
                updatedAt: new Date()
            }
        },
        shipment: {
            id: 1,
            uuid: "shipment-1",
            orderId: 1,
            status: "CONFIRMED" as const,
            quoteFingerprint: "fingerprint",
            selectedServiceCode: 1,
            selectedServiceName: "PAC",
            shippingPriceInCents: 1590,
            superfreteOrderId: null,
            superfreteProtocol: null,
            trackingCode: null,
            labelUrl: null,
            senderSnapshot: {
                platform: {
                    uuid: "platform-1",
                    name: "Atelie Guadalupe",
                    slug: "atelie-guadalupe",
                    email: "contato@atelie.com",
                    phone: null,
                    document: "12345678000199",
                    websiteUrl: "http://localhost:3000"
                },
                address: {
                    recipient: "Atelie Guadalupe",
                    document: "12345678000199",
                    postalCode: "01153000",
                    street: "Rua da Origem",
                    number: "123",
                    complement: null,
                    neighborhood: "Centro",
                    city: "Sao Paulo",
                    state: "SP",
                    country: "Brasil"
                }
            },
            calculatorPayload: null,
            calculatorResponse: null,
            quotedServices: [],
            packagingSnapshot: null,
            cartPayload: null,
            cartResponse: null,
            checkoutResponse: null,
            cancellationResponse: null,
            quotedAt: new Date(),
            confirmedAt: new Date(),
            checkoutRequestedAt: null,
            purchasedAt: null,
            cancelledAt: null,
            createdAt: new Date(),
            updatedAt: new Date()
        }
    };
}

test("shipping service keeps the stored shipment when freight is already confirmed", async () => {
    let calculateQuoteCalls = 0;

    const repository = {
        listBoxes: async () => [],
        findBoxBySlug: async () => null,
        findBoxByUuid: async () => null,
        createBox: async () => null,
        updateBoxByUuid: async () => null,
        deleteBoxByUuid: async () => null,
        listActiveBoxes: async () => {
            throw new Error("listActiveBoxes should not be called");
        },
        saveQuoteSnapshot: async () => {
            throw new Error("saveQuoteSnapshot should not be called");
        },
        confirmSelectedService: async () => {
            throw new Error("confirmSelectedService should not be called");
        },
        updateShipmentStatusByOrderId: async () => {
            throw new Error("updateShipmentStatusByOrderId should not be called");
        },
        findOrderForShipping: async () => createConfirmedOrder()
    };

    const client = {
        calculateQuote: async () => {
            calculateQuoteCalls += 1;
            return [];
        }
    };

    const service = new ShippingService(
        repository as never,
        {
            findDefaultActive: async () => createPlatform()
        } as never,
        client as never
    );
    const result = await service.quoteOrder(
        {
            sub: "user-1",
            role: "USER"
        },
        "order-1",
        {
            serviceCode: 1
        }
    );

    assert.equal(result.success, true);
    assert.equal(calculateQuoteCalls, 0);

    if (result.success) {
        const data = result.value as {
            shipment: {
                status: string;
                selectedServiceCode: number;
            };
        };

        assert.equal(data.shipment.status, "CONFIRMED");
        assert.equal(data.shipment.selectedServiceCode, 1);
    }
});

test("shipping service rejects changing the service after freight confirmation", async () => {
    const repository = {
        findOrderForShipping: async () => createConfirmedOrder()
    };

    const client = {};

    const service = new ShippingService(
        repository as never,
        {
            findDefaultActive: async () => createPlatform()
        } as never,
        client as never
    );
    const result = await service.quoteOrder(
        {
            sub: "user-1",
            role: "USER"
        },
        "order-1",
        {
            serviceCode: 2
        }
    );

    assert.equal(result.success, false);
});

test("shipping service recalculates quote when quote-affecting options change", async () => {
    let calculateQuoteCalls = 0;
    let saveQuoteCalls = 0;
    const itemUpdatedAt = new Date("2026-04-11T12:00:00.000Z");
    const boxUpdatedAt = new Date("2026-04-11T12:30:00.000Z");

    const quotedOrder = {
        ...createConfirmedOrder(),
        items: [
            {
                id: 1,
                uuid: "item-1",
                orderId: 1,
                productId: 99,
                productSize: "GRAMS_70" as const,
                productNameSnapshot: "Hidrapele",
                imageUrlSnapshot: null,
                quantity: 1,
                unitPriceInCents: 1000,
                totalPriceInCents: 1000,
                createdAt: new Date(),
                updatedAt: itemUpdatedAt,
                product: {
                    id: 99,
                    uuid: "product-1",
                    lineId: 1,
                    category: "SELFCARE" as const,
                    name: "Hidrapele",
                    slug: "hidrapele",
                    imageUrl: "/img.webp",
                    stock: null,
                    shippingWeightGrams: null,
                    description: null,
                    shortDescription: "desc curta de teste",
                    longDescription: "descricao longa de teste para o produto",
                    isActive: true,
                    createdAt: new Date(),
                    updatedAt: new Date()
                }
            }
        ],
        shipment: {
            ...createConfirmedOrder().shipment,
            status: "QUOTED" as const,
            quoteFingerprint: JSON.stringify({
                addressUuid: "address-1",
                items: [
                    {
                        uuid: "item-1",
                        productId: 99,
                        quantity: 1,
                        productSize: "GRAMS_70",
                        updatedAt: itemUpdatedAt.toISOString()
                    }
                ],
                boxes: [`box-small:${boxUpdatedAt.toISOString()}`],
                quote: {
                    ownHand: false,
                    receipt: false,
                    useInsuranceValue: false,
                    insuranceValueInCents: 0,
                    services: "1,2,17"
                }
            }),
            selectedServiceCode: null,
            selectedServiceName: null,
            shippingPriceInCents: null,
            senderSnapshot: {
                platform: {
                    uuid: "platform-1",
                    name: "Atelie Guadalupe",
                    slug: "atelie-guadalupe",
                    email: "contato@atelie.com",
                    phone: null,
                    document: "12345678000199",
                    websiteUrl: "http://localhost:3000"
                },
                address: {
                    recipient: "Atelie Guadalupe",
                    document: "12345678000199",
                    postalCode: "01153000",
                    street: "Rua da Origem",
                    number: "123",
                    complement: null,
                    neighborhood: "Centro",
                    city: "Sao Paulo",
                    state: "SP",
                    country: "Brasil"
                }
            },
            packagingSnapshot: {
                consolidatedPackage: {
                    heightCm: 11.5,
                    widthCm: 6.5,
                    lengthCm: 6.5,
                    weightKg: 0.098
                }
            }
        }
    };

    const repository = {
        listActiveBoxes: async () => [
            {
                uuid: "box-small",
                id: 1,
                name: "Caixa Pequena",
                slug: "caixa-pequena",
                category: "SELFCARE" as const,
                outerHeightCm: "11.50",
                outerWidthCm: "6.50",
                outerLengthCm: "6.50",
                emptyWeightGrams: 0,
                maxItems: 2,
                isActive: true,
                createdAt: new Date(),
                updatedAt: boxUpdatedAt
            }
        ],
        saveQuoteSnapshot: async () => {
            saveQuoteCalls += 1;
        },
        findOrderForShipping: async () => quotedOrder
    };

    const client = {
        calculateQuote: async () => {
            calculateQuoteCalls += 1;
            return [
                {
                    id: 1,
                    name: "PAC",
                    price: 15.9,
                    delivery_time: 5
                }
            ];
        }
    };

    const service = new ShippingService(
        repository as never,
        {
            findDefaultActive: async () => createPlatform()
        } as never,
        client as never
    );
    const result = await service.quoteOrder(
        {
            sub: "user-1",
            role: "USER"
        },
        "order-1",
        {
            useInsuranceValue: true
        }
    );

    assert.equal(result.success, true);
    assert.equal(calculateQuoteCalls, 1);
    assert.equal(saveQuoteCalls, 1);
});
