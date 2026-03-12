import { OrderStatus } from "../../../generated/prisma/enums";

type OrderItemEntity = {
    uuid: string;
    productNameSnapshot: string;
    imageUrlSnapshot: string | null;
    quantity: number;
    unitPriceInCents: number;
    totalPriceInCents: number;
};

type AddressEntity = {
    uuid: string;
    recipient: string;
    zipCode: string;
    street: string;
    number: string;
    complement: string | null;
    neighborhood: string;
    city: string;
    state: string;
    country: string;
};

type OrderEntity = {
    uuid: string;
    status: OrderStatus;
    subtotalInCents: number;
    shippingInCents: number;
    discountInCents: number;
    totalInCents: number;
    notes: string | null;
    placedAt: Date | null;
    createdAt: Date;
    updatedAt: Date;
    items: OrderItemEntity[];
    address?: AddressEntity | null;
};

function presentOrderItem(item: OrderItemEntity) {
    return {
        uuid: item.uuid,
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
        recipient: address.recipient,
        zipCode: address.zipCode,
        street: address.street,
        number: address.number,
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
        status: order.status,
        subtotalInCents: order.subtotalInCents,
        shippingInCents: order.shippingInCents,
        discountInCents: order.discountInCents,
        totalInCents: order.totalInCents,
        notes: order.notes,
        placedAt: order.placedAt,
        createdAt: order.createdAt,
        updatedAt: order.updatedAt,
        address: presentAddress(order.address),
        items: order.items.map((item) => presentOrderItem(item))
    };
}
