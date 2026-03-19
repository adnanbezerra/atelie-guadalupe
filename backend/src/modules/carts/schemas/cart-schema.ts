import { z } from "zod";

export const addCartItemSchema = z.object({
    productUuid: z.uuid(),
    productSize: z.enum(["GRAMS_70", "GRAMS_100"]),
    quantity: z.int().positive()
});

export const updateCartItemSchema = z.object({
    quantity: z.int().positive(),
    productSize: z.enum(["GRAMS_70", "GRAMS_100"]).optional()
});

export const cartItemUuidParamSchema = z.object({
    uuid: z.uuid()
});
