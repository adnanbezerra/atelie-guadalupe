import { PrismaClient } from "../../../generated/prisma/client";
import { ProductSize } from "../../../generated/prisma/enums";

type CreateCartInput = {
    uuid: string;
    userId: number;
};

type CreateCartItemInput = {
    uuid: string;
    cartId: number;
    productId: number;
    productSize: ProductSize;
    quantity: number;
    unitPriceInCents: number;
    productNameSnapshot: string;
};

type UpdateCartItemInput = {
    productSize?: ProductSize;
    quantity?: number;
    unitPriceInCents?: number;
    productNameSnapshot?: string;
};

export class CartRepository {
    public constructor(private readonly prisma: PrismaClient) {}

    public findByUserId(userId: number) {
        return this.prisma.cart.findUnique({
            where: {
                userId
            },
            include: {
                items: {
                    where: {
                        status: "ACTIVE"
                    },
                    include: {
                        product: {
                            include: {
                                line: true
                            }
                        }
                    },
                    orderBy: {
                        createdAt: "asc"
                    }
                }
            }
        });
    }

    public create(input: CreateCartInput) {
        return this.prisma.cart.create({
            data: input,
            include: {
                items: {
                    include: {
                        product: {
                            include: {
                                line: true
                            }
                        }
                    }
                }
            }
        });
    }

    public findItemByUuid(uuid: string) {
        return this.prisma.cartItem.findUnique({
            where: {
                uuid
            },
            include: {
                product: {
                    include: {
                        line: true
                    }
                },
                cart: true
            }
        });
    }

    public findItemByCartAndProduct(cartId: number, productId: number, productSize: ProductSize) {
        return this.prisma.cartItem.findFirst({
            where: {
                cartId,
                productId,
                productSize,
                status: "ACTIVE"
            },
            include: {
                product: {
                    include: {
                        line: true
                    }
                }
            }
        });
    }

    public createItem(input: CreateCartItemInput) {
        return this.prisma.cartItem.create({
            data: input,
            include: {
                product: {
                    include: {
                        line: true
                    }
                }
            }
        });
    }

    public updateItemByUuid(uuid: string, input: UpdateCartItemInput) {
        return this.prisma.cartItem.update({
            where: {
                uuid
            },
            data: input,
            include: {
                product: {
                    include: {
                        line: true
                    }
                },
                cart: true
            }
        });
    }

    public async deleteItemByUuid(uuid: string) {
        await this.prisma.cartItem.delete({
            where: {
                uuid
            }
        });
    }

    public async clearCart(cartId: number) {
        await this.prisma.cartItem.deleteMany({
            where: {
                cartId
            }
        });
    }
}
