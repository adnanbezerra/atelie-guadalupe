import { z } from "zod";

export const createOrderSchema = z.object({
    addressUuid: z.uuid().optional(),
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
