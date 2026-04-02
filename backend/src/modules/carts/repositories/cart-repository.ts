import {
    Cart,
    CartItem,
    PrismaClient,
    Product,
    ProductLine
} from "../../../generated/prisma/client";
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

    private cartWithItemsAndProductsInclude = {
        items: {
            where: {
                status: "ACTIVE" as const
            },
            include: {
                product: {
                    include: {
                        line: true
                    }
                }
            },
            orderBy: {
                createdAt: "asc" as const
            }
        }
    };

    private productWithLineInclude = {
        product: {
            include: {
                line: true
            }
        }
    };

    public findByUserId(userId: number) {
        return this.prisma.cart.findUnique({
            where: {
                userId
            },
            include: this.cartWithItemsAndProductsInclude
        }) as Promise<
            | (Cart & {
                  items: Array<
                      CartItem & {
                          product: Product & {
                              line: ProductLine;
                          };
                      }
                  >;
              })
            | null
        >;
    }

    public create(input: CreateCartInput) {
        return this.prisma.cart.create({
            data: input,
            include: this.cartWithItemsAndProductsInclude
        }) as Promise<
            Cart & {
                items: Array<
                    CartItem & {
                        product: Product & {
                            line: ProductLine;
                        };
                    }
                >;
            }
        >;
    }

    public findItemByUuid(uuid: string) {
        return this.prisma.cartItem.findUnique({
            where: {
                uuid
            },
            include: {
                ...this.productWithLineInclude,
                cart: true
            }
        }) as Promise<
            | (CartItem & {
                  product: Product & {
                      line: ProductLine;
                  };
                  cart: Cart;
              })
            | null
        >;
    }

    public findItemByCartAndProduct(cartId: number, productId: number, productSize: ProductSize) {
        return this.prisma.cartItem.findFirst({
            where: {
                cartId,
                productId,
                productSize,
                status: "ACTIVE"
            },
            include: this.productWithLineInclude
        }) as Promise<
            | (CartItem & {
                  product: Product & {
                      line: ProductLine;
                  };
              })
            | null
        >;
    }

    public createItem(input: CreateCartItemInput) {
        return this.prisma.cartItem.create({
            data: input,
            include: this.productWithLineInclude
        }) as Promise<
            CartItem & {
                product: Product & {
                    line: ProductLine;
                };
            }
        >;
    }

    public updateItemByUuid(uuid: string, input: UpdateCartItemInput) {
        return this.prisma.cartItem.update({
            where: {
                uuid
            },
            data: input,
            include: {
                ...this.productWithLineInclude,
                cart: true
            }
        }) as Promise<
            CartItem & {
                product: Product & {
                    line: ProductLine;
                };
                cart: Cart;
            }
        >;
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
