type CartItemEntity = {
    uuid: string;
    quantity: number;
    unitPriceInCents: number;
    productNameSnapshot: string;
    product: {
        uuid: string;
        imageUrl: string;
        stock: number;
        isActive: boolean;
    };
};

type CartEntity = {
    uuid: string;
    items: CartItemEntity[];
};

export function presentCartItem(item: CartItemEntity) {
    const isAvailable = item.product.isActive && item.product.stock >= item.quantity;

    return {
        uuid: item.uuid,
        productUuid: item.product.uuid,
        name: item.productNameSnapshot,
        quantity: item.quantity,
        unitPriceInCents: item.unitPriceInCents,
        totalPriceInCents: item.unitPriceInCents * item.quantity,
        imageUrl: item.product.imageUrl,
        isAvailable
    };
}

export function presentCart(cart: CartEntity) {
    const items = cart.items.map((item) => presentCartItem(item));

    return {
        uuid: cart.uuid,
        items,
        summary: {
            itemsCount: items.reduce((total, item) => total + item.quantity, 0),
            subtotalInCents: items.reduce((total, item) => total + item.totalPriceInCents, 0)
        }
    };
}
