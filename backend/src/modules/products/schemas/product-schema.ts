import { z } from "zod";

const imageUploadSchema = z.object({
    filename: z.string().trim().min(1).max(255),
    contentType: z.enum(["image/jpeg", "image/png", "image/webp"]),
    base64: z.string().trim().min(1)
});

export const createProductSchema = z.object({
    name: z.string().trim().min(3).max(160),
    priceInCents: z.int().positive(),
    image: imageUploadSchema,
    stock: z.int().min(0),
    shortDescription: z.string().trim().min(10).max(255),
    longDescription: z.string().trim().min(20).max(5000)
});

export const updateProductSchema = z.object({
    name: z.string().trim().min(3).max(160).optional(),
    priceInCents: z.int().positive().optional(),
    image: imageUploadSchema.optional(),
    stock: z.int().min(0).optional(),
    shortDescription: z.string().trim().min(10).max(255).optional(),
    longDescription: z.string().trim().min(20).max(5000).optional()
}).refine((data) => Object.keys(data).length > 0, {
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
