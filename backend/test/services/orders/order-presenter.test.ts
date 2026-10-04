import * as assert from "node:assert";
import { test } from "node:test";
import {
    OrderStatus,
    PaymentMethod,
    ProductSize
} from "../../../src/generated/prisma/enums";
import { presentOrderDetails } from "../../../src/modules/orders/services/order-presenter";

function orderDetailsFixture() {
    const now = new Date("2026-03-12T12:00:00.000Z");
    return {
        uuid: "order-1",
        paymentIdempotencyKey: "payment-key",
        status: OrderStatus.PAID,
        subtotalInCents: 6000,
        shippingInCents: 1680,
        discountInCents: 0,
        paymentMethod: PaymentMethod.CREDIT_CARD,
        totalInCents: 7680,
        notes: null,
        placedAt: now,
        createdAt: now,
        updatedAt: now,
        items: [
            {
                uuid: "item-1",
                productSize: ProductSize.GRAMS_70,
                productNameSnapshot: "Sabonete",
                imageUrlSnapshot: null,
                quantity: 1,
                unitPriceInCents: 6000,
                totalPriceInCents: 6000
            }
        ],
        payment: {
            status: "PAID",
            providerMethod: "CARD",
            providerCheckoutId: "bill_abc123",
            checkoutUrl: null,
            paidAmountInCents: 7680,
            cardBrand: "Mastercard",
            cardLastFourDigits: "4242",
            providerResponse: { cardNumber: "should-not-leak" }
        },
        shipment: {
            status: "LABEL_PURCHASED",
            selectedServiceCode: 1,
            selectedServiceName: "PAC",
            quotedServices: [
                {
                    serviceCode: 1,
                    serviceName: "PAC",
                    deliveryDays: 7
                }
            ],
            trackingCode: "BR123456789",
            labelUrl: null,
            checkoutResponse: { internal: true }
        }
    };
}

test("order detail presents safe payment and shipment fields", () => {
    const result = presentOrderDetails(orderDetailsFixture());

    assert.deepStrictEqual(result.payment, {
        status: "PAID",
        method: "CREDIT_CARD",
        providerCheckoutId: "bill_abc123",
        checkoutUrl: null,
        paidAmountInCents: 7680,
        card: {
            brand: "Mastercard",
            lastFourDigits: "4242"
        }
    });
    assert.deepStrictEqual(result.shipment, {
        status: "LABEL_PURCHASED",
        selectedServiceCode: 1,
        selectedServiceName: "PAC",
        deliveryDays: 7,
        estimatedDeliveryAt: null,
        trackingCode: "BR123456789",
        trackingUrl: "https://rastreamento.superfrete.com/#BR123456789",
        labelUrl: null
    });
    assert.equal("providerResponse" in (result.payment ?? {}), false);
    assert.equal("checkoutResponse" in (result.shipment ?? {}), false);
});

test("order detail omits invalid or unavailable card snapshot", () => {
    const fixture = orderDetailsFixture();
    fixture.payment.cardLastFourDigits = "4242424242424242";

    const result = presentOrderDetails(fixture);

    assert.equal(result.payment?.card, null);
});
