import type { Cart, DeliveryOption, PickupLocation } from "@/lib/types";

export type ShippingOption = {
    id: string;
    type: "LOCAL_PICKUP" | "SHIPMENT";
    serviceCode: number | null;
    name: string;
    priceInCents: number;
    deliveryLabel: string;
    destinationLabel?: string;
    location?: PickupLocation;
};

function getShippingDeliveryLabel(service: {
    deliveryDays: number | null;
    deliveryRange: { min: number | null; max: number | null };
}) {
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

export function sortDeliveryOptions(options: DeliveryOption[]) {
    return [...options].sort((left, right) => {
        if (left.type !== right.type) {
            return left.type === "LOCAL_PICKUP" ? -1 : 1;
        }

        if (left.type === "LOCAL_PICKUP" || right.type === "LOCAL_PICKUP") {
            return 0;
        }

        const priceDifference = left.priceInCents - right.priceInCents;
        if (priceDifference !== 0) return priceDifference;

        const leftDays =
            left.deliveryRange.max ?? left.deliveryDays ?? Infinity;
        const rightDays =
            right.deliveryRange.max ?? right.deliveryDays ?? Infinity;

        return leftDays - rightDays;
    });
}

function getPickupLocationLabel(location: PickupLocation) {
    const street = [location.street, location.number, location.complement]
        .filter(Boolean)
        .join(", ");
    const city = [location.neighborhood, location.city, location.state]
        .filter(Boolean)
        .join(" · ");

    return [street, city, `CEP ${location.zipCode}`]
        .filter(Boolean)
        .join(" — ");
}

export function toDeliveryOption(
    option: DeliveryOption,
    destinationLabel?: string,
): ShippingOption {
    if (option.type === "LOCAL_PICKUP") {
        return {
            id: option.id,
            type: option.type,
            serviceCode: null,
            name: option.name,
            priceInCents: option.priceInCents,
            deliveryLabel: `Retire em ${option.location.name}`,
            destinationLabel: getPickupLocationLabel(option.location),
            location: option.location,
        };
    }

    return {
        id: option.id,
        type: option.type,
        serviceCode: option.serviceCode,
        name: option.name,
        priceInCents: option.priceInCents,
        deliveryLabel: getShippingDeliveryLabel({
            deliveryDays: option.deliveryDays,
            deliveryRange: option.deliveryRange,
        }),
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
