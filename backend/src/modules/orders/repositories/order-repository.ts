import { PrismaClient } from "../../../generated/prisma/client";
import { OrderStatus } from "../../../generated/prisma/enums";

type CreateOrderInput = {
    uuid: string;
    userId: number;
    addressId?: number;
    status: OrderStatus;
    subtotalInCents: number;
    shippingInCents: number;
    discountInCents: number;
    totalInCents: number;
    notes?: string;
    placedAt: Date;
    items: Array<{
        uuid: string;
        productId?: number;
        productNameSnapshot: string;
        imageUrlSnapshot?: string;
        quantity: number;
        unitPriceInCents: number;
        totalPriceInCents: number;
    }>;
};

export class OrderRepository {
    public constructor(private readonly prisma: PrismaClient) {}

    public create(input: CreateOrderInput) {
        return this.prisma.order.create({
            data: {
                uuid: input.uuid,
                userId: input.userId,
                addressId: input.addressId,
                status: input.status,
                subtotalInCents: input.subtotalInCents,
                shippingInCents: input.shippingInCents,
                discountInCents: input.discountInCents,
                totalInCents: input.totalInCents,
                notes: input.notes,
                placedAt: input.placedAt,
                items: {
                    create: input.items
                }
            },
            include: {
                items: true,
                address: true
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
                address: true
            },
            orderBy: {
                createdAt: "desc"
            }
        });
    }

    public listAll() {
        return this.prisma.order.findMany({
            include: {
                items: true,
                address: true,
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
                user: {
                    include: {
                        role: true
                    }
                }
            }
        });
    }
}
