import { z } from "zod";

export const addCartItemSchema = z.object({
    productUuid: z.uuid(),
    quantity: z.int().positive()
});

export const updateCartItemSchema = z.object({
    quantity: z.int().positive()
});

export const cartItemUuidParamSchema = z.object({
    uuid: z.uuid()
});
