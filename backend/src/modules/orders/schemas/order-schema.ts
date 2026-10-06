import { z } from "zod";

export const createOrderSchema = z.object({
    addressUuid: z.uuid(),
    shipping: z.object({
        serviceCode: z.number().int().positive(),
        priceInCents: z.number().int().min(0)
    }),
    paymentMethod: z.enum(["PIX", "CREDIT_CARD", "DEBIT_CARD"]).optional(),
    notes: z.string().trim().max(500).optional()
});

export const updateOrderStatusSchema = z.object({
    status: z.enum([
        "PENDING",
        "AWAITING_PAYMENT",
        "PAID",
        "PROCESSING",
        "SHIPPED",
        "DELIVERED",
        "CANCELLED"
    ])
});

export const orderUuidParamSchema = z.object({
    uuid: z.uuid()
});

export const listOrdersQuerySchema = z.object({
    page: z.coerce.number().int().min(1).default(1),
    pageSize: z.coerce.number().int().min(1).max(100).default(20),
    status: z
        .enum([
            "PENDING",
            "AWAITING_PAYMENT",
            "PAID",
            "PROCESSING",
            "SHIPPED",
            "DELIVERED",
            "CANCELLED"
        ])
        .optional(),
    paymentStatus: z
        .enum([
            "CREATING",
            "PENDING",
            "EXPIRED",
            "PAID",
            "REFUND_PENDING",
            "REFUNDED",
            "DISPUTED",
            "LOST"
        ])
        .optional(),
    shipmentStatus: z
        .enum([
            "DRAFT",
            "QUOTED",
            "CONFIRMED",
            "CHECKOUT_REQUESTED",
            "LABEL_PURCHASED",
            "CANCELLED"
        ])
        .optional(),
    fulfillmentStatus: z
        .enum(["PENDING", "PROCESSING", "RETRY_SCHEDULED", "COMPLETED", "FAILED"])
        .optional(),
    search: z.string().trim().min(1).max(160).optional(),
    sort: z
        .enum(["CREATED_AT_DESC", "CREATED_AT_ASC", "TOTAL_DESC", "TOTAL_ASC"])
        .default("CREATED_AT_DESC")
});
