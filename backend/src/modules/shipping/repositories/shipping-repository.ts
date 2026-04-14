import { Prisma, PrismaClient } from "../../../generated/prisma/client";
import { ProductCategory, ShippingStatus } from "../../../generated/prisma/enums";

type CreateShippingBoxInput = {
    uuid: string;
    name: string;
    slug: string;
    category: ProductCategory;
    outerHeightCm: string;
    outerWidthCm: string;
    outerLengthCm: string;
    emptyWeightGrams: number;
    maxItems: number;
    isActive: boolean;
};

type UpdateShippingBoxInput = Partial<CreateShippingBoxInput>;

const shippingOrderInclude = {
    address: true,
    items: {
        include: {
            product: true
        }
    },
    shipment: true,
    user: {
        include: {
            role: true
        }
    }
} as const;

type ShipmentUpsertInput = Prisma.OrderShipmentUncheckedCreateInput;
type ShipmentUpdateInput = Prisma.OrderShipmentUncheckedUpdateInput;

export class ShippingRepository {
    public constructor(private readonly prisma: PrismaClient) {}

    public listBoxes(category?: ProductCategory) {
        return this.prisma.shippingBox.findMany({
            where: {
                ...(category ? { category } : {})
            },
            orderBy: [
                {
                    category: "asc"
                },
                {
                    maxItems: "asc"
                }
            ]
        });
    }

    public listActiveBoxes() {
        return this.prisma.shippingBox.findMany({
            where: {
                isActive: true
            },
            orderBy: [
                {
                    category: "asc"
                },
                {
                    maxItems: "asc"
                }
            ]
        });
    }

    public findBoxByUuid(uuid: string) {
        return this.prisma.shippingBox.findUnique({
            where: {
                uuid
            }
        });
    }

    public findBoxBySlug(slug: string) {
        return this.prisma.shippingBox.findUnique({
            where: {
                slug
            }
        });
    }

    public createBox(input: CreateShippingBoxInput) {
        return this.prisma.shippingBox.create({
            data: input
        });
    }

    public updateBoxByUuid(uuid: string, input: UpdateShippingBoxInput) {
        return this.prisma.shippingBox.update({
            where: {
                uuid
            },
            data: input
        });
    }

    public deleteBoxByUuid(uuid: string) {
        return this.prisma.shippingBox.delete({
            where: {
                uuid
            }
        });
    }

    public findOrderForShipping(orderUuid: string) {
        return this.prisma.order.findUnique({
            where: {
                uuid: orderUuid
            },
            include: shippingOrderInclude
        });
    }

    public saveQuoteSnapshot(
        orderId: number,
        create: ShipmentUpsertInput,
        update: ShipmentUpdateInput
    ) {
        return this.prisma.orderShipment.upsert({
            where: {
                orderId
            },
            create,
            update
        });
    }

    public confirmSelectedService(
        orderId: number,
        shippingInCents: number,
        totalInCents: number,
        create: ShipmentUpsertInput,
        update: ShipmentUpdateInput
    ) {
        return this.prisma.$transaction(async (tx) => {
            const shipment = await tx.orderShipment.upsert({
                where: {
                    orderId
                },
                create,
                update
            });

            await tx.order.update({
                where: {
                    id: orderId
                },
                data: {
                    shippingInCents,
                    totalInCents
                }
            });

            return shipment;
        });
    }

    public updateShipmentByOrderId(orderId: number, input: ShipmentUpdateInput) {
        return this.prisma.orderShipment.update({
            where: {
                orderId
            },
            data: input
        });
    }

    public updateShipmentStatusByOrderId(
        orderId: number,
        status: ShippingStatus,
        input: ShipmentUpdateInput
    ) {
        return this.prisma.orderShipment.update({
            where: {
                orderId
            },
            data: {
                status,
                ...input
            }
        });
    }
}
