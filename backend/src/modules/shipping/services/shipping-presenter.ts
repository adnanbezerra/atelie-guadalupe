import { ProductCategory, ShippingStatus } from "../../../generated/prisma/enums";

type ShippingBoxEntity = {
    uuid: string;
    name: string;
    slug: string;
    category: ProductCategory;
    outerHeightCm: unknown;
    outerWidthCm: unknown;
    outerLengthCm: unknown;
    emptyWeightGrams: number;
    maxItems: number;
    isActive: boolean;
    createdAt: Date;
    updatedAt: Date;
};

type OrderShipmentEntity = {
    uuid: string;
    status: ShippingStatus;
    selectedServiceCode: number | null;
    selectedServiceName: string | null;
    shippingPriceInCents: number | null;
    superfreteOrderId: string | null;
    superfreteProtocol: string | null;
    trackingCode: string | null;
    labelUrl: string | null;
    senderSnapshot: unknown;
    quotedServices: unknown;
    packagingSnapshot: unknown;
    quotedAt: Date | null;
    confirmedAt: Date | null;
    checkoutRequestedAt: Date | null;
    purchasedAt: Date | null;
    cancelledAt: Date | null;
    createdAt: Date;
    updatedAt: Date;
};

function toNumber(value: unknown) {
    return Number(value);
}

export function presentShippingBox(box: ShippingBoxEntity) {
    return {
        uuid: box.uuid,
        name: box.name,
        slug: box.slug,
        category: box.category,
        dimensionsCm: {
            height: toNumber(box.outerHeightCm),
            width: toNumber(box.outerWidthCm),
            length: toNumber(box.outerLengthCm)
        },
        emptyWeightGrams: box.emptyWeightGrams,
        maxItems: box.maxItems,
        isActive: box.isActive,
        createdAt: box.createdAt,
        updatedAt: box.updatedAt
    };
}

export function presentShipment(shipment: OrderShipmentEntity) {
    return {
        uuid: shipment.uuid,
        status: shipment.status,
        selectedServiceCode: shipment.selectedServiceCode,
        selectedServiceName: shipment.selectedServiceName,
        shippingPriceInCents: shipment.shippingPriceInCents,
        superfreteOrderId: shipment.superfreteOrderId,
        superfreteProtocol: shipment.superfreteProtocol,
        trackingCode: shipment.trackingCode,
        labelUrl: shipment.labelUrl,
        senderSnapshot: shipment.senderSnapshot,
        quotedServices: shipment.quotedServices,
        packaging: shipment.packagingSnapshot,
        quotedAt: shipment.quotedAt,
        confirmedAt: shipment.confirmedAt,
        checkoutRequestedAt: shipment.checkoutRequestedAt,
        purchasedAt: shipment.purchasedAt,
        cancelledAt: shipment.cancelledAt,
        createdAt: shipment.createdAt,
        updatedAt: shipment.updatedAt
    };
}
