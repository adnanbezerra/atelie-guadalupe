import { z } from "zod";

const productSizeSchema = z.enum(["GRAMS_70", "GRAMS_100"]);

const imageUploadSchema = z.object({
    filename: z.string().trim().min(1).max(255),
    contentType: z.enum(["image/jpeg", "image/png", "image/webp"]),
    base64: z.string().trim().min(1)
});

export const createProductLineSchema = z.object({
    name: z.string().trim().min(2).max(120),
    pricePerGramInCents: z.int().positive()
});

export const updateProductLineSchema = z
    .object({
        name: z.string().trim().min(2).max(120).optional(),
        pricePerGramInCents: z.int().positive().optional()
    })
    .refine((data) => Object.keys(data).length > 0, {
        message: "Informe ao menos um campo para atualizacao"
    });

export const createProductSchema = z.object({
    name: z.string().trim().min(3).max(160),
    lineUuid: z.uuid(),
    image: imageUploadSchema,
    stock: z.int().min(0),
    shortDescription: z.string().trim().min(10).max(255),
    longDescription: z.string().trim().min(20).max(5000)
});

export const updateProductSchema = z
    .object({
        name: z.string().trim().min(3).max(160).optional(),
        lineUuid: z.uuid().optional(),
        image: imageUploadSchema.optional(),
        stock: z.int().min(0).optional(),
        shortDescription: z.string().trim().min(10).max(255).optional(),
        longDescription: z.string().trim().min(20).max(5000).optional()
    })
    .refine((data) => Object.keys(data).length > 0, {
        message: "Informe ao menos um campo para atualizacao"
    });

export const productUuidParamSchema = z.object({
    uuid: z.uuid()
});

export const productLineUuidParamSchema = z.object({
    uuid: z.uuid()
});

export const listProductsQuerySchema = z.object({
    page: z.coerce.number().int().min(1).default(1),
    pageSize: z.coerce.number().int().min(1).max(100).default(20),
    search: z.string().trim().min(1).optional(),
    lineUuid: z.uuid().optional(),
    size: productSizeSchema.optional(),
    minPriceInCents: z.coerce.number().int().min(1).optional(),
    maxPriceInCents: z.coerce.number().int().min(1).optional(),
    inStock: z.coerce.boolean().optional()
}).refine(
    (data) =>
        (!data.minPriceInCents && !data.maxPriceInCents) ||
        typeof data.size === "string",
    {
        message: "Informe o tamanho para filtrar por preco",
        path: ["size"]
    }
);
