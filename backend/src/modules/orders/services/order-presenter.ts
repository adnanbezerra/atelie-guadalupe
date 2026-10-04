import { OrderStatus, PaymentMethod, ProductSize } from "../../../generated/prisma/enums";
import { getProductSizeInGrams } from "../../products/services/product-pricing";

type OrderItemEntity = {
    uuid: string;
    productSize: ProductSize;
    productNameSnapshot: string;
    imageUrlSnapshot: string | null;
    quantity: number;
    unitPriceInCents: number;
    totalPriceInCents: number;
};

type AddressEntity = {
    uuid: string;
    zipCode: string;
    street: string;
    number: string;
    apartmentNumber: string | null;
    complement: string | null;
    neighborhood: string;
    city: string;
    state: string;
    country: string;
};

type OrderEntity = {
    uuid: string;
    paymentIdempotencyKey: string;
    status: OrderStatus;
    subtotalInCents: number;
    shippingInCents: number;
    discountInCents: number;
    paymentMethod?: PaymentMethod | null;
    promotionDiscountInCents?: number;
    couponDiscountInCents?: number;
    couponCodeSnapshot?: string | null;
    totalInCents: number;
    notes: string | null;
    placedAt: Date | null;
    createdAt: Date;
    updatedAt: Date;
    items: OrderItemEntity[];
    address?: AddressEntity | null;
    payment?: {
        status: string;
        providerMethod: string | null;
        providerCheckoutId: string | null;
        checkoutUrl: string | null;
        paidAmountInCents: number | null;
        cardBrand: string | null;
        cardLastFourDigits: string | null;
    } | null;
    shipment?: {
        status: string;
        selectedServiceCode: number | null;
        selectedServiceName: string | null;
        quotedServices: unknown;
        trackingCode: string | null;
        labelUrl: string | null;
    } | null;
    fulfillmentJob?: {
        status: string;
        attempts: number;
        lastError: string | null;
        nextAttemptAt: Date;
    } | null;
};

type PaymentMethodValue = "PIX" | "CREDIT_CARD" | "DEBIT_CARD";

function presentPaymentMethod(order: OrderEntity): PaymentMethodValue | null {
    const providerMethod = order.payment?.providerMethod?.toUpperCase();
    if (providerMethod === "PIX") return "PIX";
    if (providerMethod === "CREDIT_CARD") return "CREDIT_CARD";
    if (providerMethod === "DEBIT_CARD") return "DEBIT_CARD";
    if (providerMethod === "CARD") {
        return order.paymentMethod === PaymentMethod.DEBIT_CARD
            ? "DEBIT_CARD"
            : "CREDIT_CARD";
    }
    return order.paymentMethod ?? null;
}

function presentPayment(order: OrderEntity) {
    if (!order.payment) return null;

    const method = presentPaymentMethod(order);
    const lastFourDigits = order.payment.cardLastFourDigits;
    const card =
        (method === "CREDIT_CARD" || method === "DEBIT_CARD") &&
        lastFourDigits !== null &&
        /^\d{4}$/.test(lastFourDigits)
            ? {
                  brand: order.payment.cardBrand,
                  lastFourDigits
              }
            : null;

    return {
        status: order.payment.status,
        method,
        providerCheckoutId: order.payment.providerCheckoutId,
        checkoutUrl: order.payment.checkoutUrl,
        paidAmountInCents: order.payment.paidAmountInCents,
        card
    };
}

function selectedDeliveryDays(shipment: NonNullable<OrderEntity["shipment"]>) {
    if (!Array.isArray(shipment.quotedServices)) return null;

    const selected = shipment.quotedServices.find((service) => {
        if (!service || typeof service !== "object") return false;
        return Reflect.get(service, "serviceCode") === shipment.selectedServiceCode;
    });
    if (!selected || typeof selected !== "object") return null;

    const deliveryDays = Reflect.get(selected, "deliveryDays");
    return typeof deliveryDays === "number" && Number.isFinite(deliveryDays)
        ? deliveryDays
        : null;
}

function presentShipment(shipment: OrderEntity["shipment"]) {
    if (!shipment) return null;

    return {
        status: shipment.status,
        selectedServiceCode: shipment.selectedServiceCode,
        selectedServiceName: shipment.selectedServiceName,
        deliveryDays: selectedDeliveryDays(shipment),
        estimatedDeliveryAt: null,
        trackingCode: shipment.trackingCode,
        trackingUrl: shipment.trackingCode
            ? `https://rastreamento.superfrete.com/#${encodeURIComponent(shipment.trackingCode)}`
            : null,
        labelUrl: shipment.labelUrl
    };
}

function presentOrderItem(item: OrderItemEntity) {
    return {
        uuid: item.uuid,
        productSize: item.productSize,
        grams: getProductSizeInGrams(item.productSize),
        productNameSnapshot: item.productNameSnapshot,
        imageUrlSnapshot: item.imageUrlSnapshot,
        quantity: item.quantity,
        unitPriceInCents: item.unitPriceInCents,
        totalPriceInCents: item.totalPriceInCents
    };
}

function presentAddress(address: AddressEntity | null | undefined) {
    if (!address) {
        return null;
    }

    return {
        uuid: address.uuid,
        zipCode: address.zipCode,
        street: address.street,
        number: address.number,
        apartmentNumber: address.apartmentNumber,
        complement: address.complement,
        neighborhood: address.neighborhood,
        city: address.city,
        state: address.state,
        country: address.country
    };
}

export function presentOrder(order: OrderEntity) {
    return {
        uuid: order.uuid,
        paymentIdempotencyKey: order.paymentIdempotencyKey,
        status: order.status,
        subtotalInCents: order.subtotalInCents,
        shippingInCents: order.shippingInCents,
        discountInCents: order.discountInCents,
        paymentMethod: order.paymentMethod ?? null,
        promotionDiscountInCents: order.promotionDiscountInCents ?? 0,
        couponDiscountInCents: order.couponDiscountInCents ?? 0,
        couponCode: order.couponCodeSnapshot ?? null,
        totalInCents: order.totalInCents,
        notes: order.notes,
        placedAt: order.placedAt,
        createdAt: order.createdAt,
        updatedAt: order.updatedAt,
        address: presentAddress(order.address),
        payment: order.payment ?? null,
        shipment: order.shipment ?? null,
        fulfillment: order.fulfillmentJob ?? null,
        items: order.items.map((item) => presentOrderItem(item))
    };
}

export function presentOrderDetails(order: OrderEntity) {
    return {
        ...presentOrder(order),
        payment: presentPayment(order),
        shipment: presentShipment(order.shipment)
    };
}
