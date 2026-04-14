import { z } from "zod";

const productCategorySchema = z.enum(["SELFCARE", "ARTISANAL"]);

export const shippingOrderParamSchema = z.object({
    orderUuid: z.uuid()
});

export const shippingBoxParamSchema = z.object({
    uuid: z.uuid()
});

export const createShippingBoxSchema = z.object({
    name: z.string().trim().min(2).max(120),
    category: productCategorySchema,
    outerHeightCm: z.number().positive(),
    outerWidthCm: z.number().positive(),
    outerLengthCm: z.number().positive(),
    emptyWeightGrams: z.int().min(0).optional(),
    maxItems: z.int().positive(),
    isActive: z.boolean().optional()
});

export const updateShippingBoxSchema = z
    .object({
        name: z.string().trim().min(2).max(120).optional(),
        category: productCategorySchema.optional(),
        outerHeightCm: z.number().positive().optional(),
        outerWidthCm: z.number().positive().optional(),
        outerLengthCm: z.number().positive().optional(),
        emptyWeightGrams: z.int().min(0).optional(),
        maxItems: z.int().positive().optional(),
        isActive: z.boolean().optional()
    })
    .refine((data) => Object.keys(data).length > 0, {
        message: "Informe ao menos um campo para atualizacao"
    });

export const quoteOrderShipmentSchema = z.object({
    serviceCode: z.number().int().positive().optional(),
    ownHand: z.boolean().optional(),
    receipt: z.boolean().optional(),
    useInsuranceValue: z.boolean().optional(),
    insuranceValueInCents: z.number().int().min(0).optional(),
    refresh: z.boolean().optional()
});
