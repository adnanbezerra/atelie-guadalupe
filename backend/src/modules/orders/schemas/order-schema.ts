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
