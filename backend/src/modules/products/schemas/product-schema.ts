import { z } from "zod";

export const createProductSchema = z.object({
    name: z.string().trim().min(3).max(160),
    priceInCents: z.int().positive(),
    imageUrl: z.url(),
    stock: z.int().min(0),
    shortDescription: z.string().trim().min(10).max(255),
    longDescription: z.string().trim().min(20).max(5000)
});

export const updateProductSchema = createProductSchema.partial().refine((data) => Object.keys(data).length > 0, {
    message: "Informe ao menos um campo para atualizacao"
});

export const productUuidParamSchema = z.object({
    uuid: z.uuid()
});

export const listProductsQuerySchema = z.object({
    page: z.coerce.number().int().min(1).default(1),
    pageSize: z.coerce.number().int().min(1).max(100).default(20),
    search: z.string().trim().min(1).optional(),
    minPriceInCents: z.coerce.number().int().min(1).optional(),
    maxPriceInCents: z.coerce.number().int().min(1).optional(),
    inStock: z.coerce.boolean().optional()
});
