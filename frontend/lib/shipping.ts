import type { Cart, ShippingQuoteService } from "@/lib/types";

export type ShippingOption = {
    id: string;
    serviceCode: number;
    name: string;
    priceInCents: number;
    deliveryLabel: string;
    destinationLabel?: string;
};

export function getShippingDeliveryLabel(service: ShippingQuoteService) {
    const { min, max } = service.deliveryRange;

    if (min != null && max != null) {
        return min === max
            ? `Chega em ${max} dias úteis`
            : `Chega de ${min} a ${max} dias úteis`;
    }

    if (service.deliveryDays != null) {
        return `Chega em até ${service.deliveryDays} dias úteis`;
    }

    return "Prazo confirmado ao finalizar o pedido";
}

export function sortShippingServices(services: ShippingQuoteService[]) {
    return [...services].sort((left, right) => {
        const priceDifference = left.priceInCents - right.priceInCents;
        if (priceDifference !== 0) return priceDifference;

        const leftDays =
            left.deliveryRange.max ?? left.deliveryDays ?? Infinity;
        const rightDays =
            right.deliveryRange.max ?? right.deliveryDays ?? Infinity;

        return leftDays - rightDays;
    });
}

export function toShippingOption(
    service: ShippingQuoteService,
    destinationLabel?: string,
): ShippingOption {
    return {
        id: `shipping-${service.serviceCode}`,
        serviceCode: service.serviceCode,
        name: service.serviceName,
        priceInCents: service.priceInCents,
        deliveryLabel: getShippingDeliveryLabel(service),
        destinationLabel,
    };
}

export function getShippingContextKey(
    cart: Pick<Cart, "uuid" | "items"> | null,
    zipCode: string,
) {
    if (!cart?.items.length || zipCode.length !== 8) return "";

    const source = [
        cart.uuid,
        zipCode,
        ...cart.items
            .map(
                (item) =>
                    `${item.productUuid}:${item.productSize}:${item.quantity}`,
            )
            .sort(),
    ].join("|");
    let hash = 2166136261;

    for (let index = 0; index < source.length; index += 1) {
        hash ^= source.charCodeAt(index);
        hash = Math.imul(hash, 16777619);
    }

    return (hash >>> 0).toString(36);
}
