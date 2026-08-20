import { Prisma, PrismaClient } from "../../../generated/prisma/client";
import { AppError } from "../../../core/errors/app-error";
import { OrderStatus, PaymentMethod, ProductSize } from "../../../generated/prisma/enums";

type CreateOrderInput = {
    uuid: string;
    paymentIdempotencyKey: string;
    userId: number;
    addressId?: number;
    status: OrderStatus;
    subtotalInCents: number;
    shippingInCents: number;
    discountInCents: number;
    promotionDiscountInCents?: number;
    couponDiscountInCents?: number;
    couponId?: number;
    couponCodeSnapshot?: string;
    totalInCents: number;
    paymentMethod?: PaymentMethod;
    notes?: string;
    placedAt: Date;
    items: Array<{
        uuid: string;
        productId?: number;
        productSize: ProductSize;
        productNameSnapshot: string;
        imageUrlSnapshot?: string;
        quantity: number;
        unitPriceInCents: number;
        totalPriceInCents: number;
    }>;
};

type CouponRedemptionInput = Omit<Prisma.CouponRedemptionUncheckedCreateInput, "orderId">;
type CouponRedemptionGuard = {
    couponId: number;
    userId: number;
    maxUses: number;
};

export class OrderRepository {
    public constructor(private readonly prisma: PrismaClient) {}

    public create(input: CreateOrderInput) {
        return this.prisma.order.create({
            data: {
                uuid: input.uuid,
                paymentIdempotencyKey: input.paymentIdempotencyKey,
                userId: input.userId,
                addressId: input.addressId,
                status: input.status,
                subtotalInCents: input.subtotalInCents,
                shippingInCents: input.shippingInCents,
                discountInCents: input.discountInCents,
                promotionDiscountInCents: input.promotionDiscountInCents,
                couponDiscountInCents: input.couponDiscountInCents,
                couponId: input.couponId,
                couponCodeSnapshot: input.couponCodeSnapshot,
                totalInCents: input.totalInCents,
                paymentMethod: input.paymentMethod,
                notes: input.notes,
                placedAt: input.placedAt,
                items: {
                    create: input.items
                }
            },
            include: {
                items: true,
                address: true,
                payment: true,
                shipment: true,
                fulfillmentJob: true
            }
        });
    }

    public async createFromCart(
        input: CreateOrderInput,
        cart: {
            id: number;
            itemUuids: string[];
        },
        couponRedemption?: CouponRedemptionInput,
        couponGuard?: CouponRedemptionGuard
    ) {
        const orderId = await this.prisma.$transaction(
            async (tx) => {
                if (couponGuard) {
                    const usedCount = await tx.couponRedemption.count({
                        where: {
                            couponId: couponGuard.couponId
                        }
                    });
                    const existingUse = await tx.couponRedemption.findUnique({
                        where: {
                            couponId_userId: {
                                couponId: couponGuard.couponId,
                                userId: couponGuard.userId
                            }
                        }
                    });

                    if (usedCount >= couponGuard.maxUses) {
                        throw AppError.business("Cupom atingiu o limite de usos");
                    }

                    if (existingUse) {
                        throw AppError.business("Usuario ja utilizou este cupom");
                    }
                }

                const order = await tx.order.create({
                    data: {
                        uuid: input.uuid,
                        paymentIdempotencyKey: input.paymentIdempotencyKey,
                        userId: input.userId,
                        addressId: input.addressId,
                        status: input.status,
                        subtotalInCents: input.subtotalInCents,
                        shippingInCents: input.shippingInCents,
                        discountInCents: input.discountInCents,
                        promotionDiscountInCents: input.promotionDiscountInCents,
                        couponDiscountInCents: input.couponDiscountInCents,
                        couponId: input.couponId,
                        couponCodeSnapshot: input.couponCodeSnapshot,
                        totalInCents: input.totalInCents,
                        paymentMethod: input.paymentMethod,
                        notes: input.notes,
                        placedAt: input.placedAt
                    }
                });

                await tx.orderItem.createMany({
                    data: input.items.map((item) => ({
                        ...item,
                        orderId: order.id
                    }))
                });

                if (couponRedemption) {
                    await tx.couponRedemption.create({
                        data: {
                            ...couponRedemption,
                            orderId: order.id
                        }
                    });
                }

                await tx.cartItem.deleteMany({
                    where: {
                        uuid: {
                            in: cart.itemUuids
                        }
                    }
                });

                await tx.cart.update({
                    where: {
                        id: cart.id
                    },
                    data: {
                        couponId: null
                    }
                });

                return order.id;
            },
            {
                isolationLevel: "Serializable"
            }
        );

        return this.prisma.order.findUniqueOrThrow({
            where: { id: orderId },
            include: {
                items: true,
                address: true,
                payment: true,
                shipment: true,
                fulfillmentJob: true
            }
        });
    }

    public listByUserId(userId: number) {
        return this.prisma.order.findMany({
            where: {
                userId
            },
            include: {
                items: true,
                address: true,
                payment: true,
                shipment: true,
                fulfillmentJob: true
            },
            orderBy: {
                createdAt: "desc"
            }
        });
    }

    public async listByUserIdPaginated(userId: number, page: number, pageSize: number) {
        const [orders, total] = await this.prisma.$transaction([
            this.prisma.order.findMany({
                where: {
                    userId
                },
                include: {
                    items: true,
                    address: true,
                    payment: true,
                    shipment: true,
                    fulfillmentJob: true
                },
                orderBy: {
                    createdAt: "desc"
                },
                skip: (page - 1) * pageSize,
                take: pageSize
            }),
            this.prisma.order.count({
                where: {
                    userId
                }
            })
        ]);

        return {
            orders,
            total
        };
    }

    public listAll() {
        return this.prisma.order.findMany({
            include: {
                items: true,
                address: true,
                payment: true,
                shipment: true,
                fulfillmentJob: true,
                user: {
                    include: {
                        role: true
                    }
                }
            },
            orderBy: {
                createdAt: "desc"
            }
        });
    }

    public findByUuid(uuid: string) {
        return this.prisma.order.findUnique({
            where: {
                uuid
            },
            include: {
                items: true,
                address: true,
                payment: true,
                shipment: true,
                fulfillmentJob: true,
                user: {
                    include: {
                        role: true
                    }
                }
            }
        });
    }

    public updateStatus(uuid: string, status: OrderStatus) {
        return this.prisma.order.update({
            where: {
                uuid
            },
            data: {
                status
            },
            include: {
                items: true,
                address: true,
                payment: true,
                shipment: true,
                fulfillmentJob: true,
                user: {
                    include: {
                        role: true
                    }
                }
            }
        });
    }
}
