import { z } from "zod";

const productCategorySchema = z.enum(["SELFCARE", "ARTISANAL"]);
const promotionScopeSchema = z.enum(["ALL_PRODUCTS", "CATEGORY"]);

const emailListSchema = z
    .array(z.email().transform((email) => email.trim().toLowerCase()))
    .max(500)
    .default([]);

const dateTimeSchema = z.iso.datetime().transform((value) => new Date(value));

export const couponUuidParamSchema = z.object({
    uuid: z.uuid()
});

export const couponCodeSchema = z.object({
    code: z.string().trim().min(2).max(80)
});

export const createCouponSchema = z.object({
    code: z.string().trim().min(2).max(80),
    discountPercent: z.int().min(1).max(100),
    validUntil: dateTimeSchema.optional(),
    maxUses: z.int().positive(),
    emails: emailListSchema,
    stackableWithPromotions: z.boolean().default(false),
    isActive: z.boolean().default(true)
});

export const updateCouponSchema = z
    .object({
        code: z.string().trim().min(2).max(80).optional(),
        discountPercent: z.int().min(1).max(100).optional(),
        validUntil: dateTimeSchema.nullable().optional(),
        maxUses: z.int().positive().optional(),
        emails: emailListSchema.optional(),
        stackableWithPromotions: z.boolean().optional(),
        isActive: z.boolean().optional()
    })
    .refine((data) => Object.keys(data).length > 0, {
        message: "Informe ao menos um campo para atualizacao"
    });

export const promotionUuidParamSchema = z.object({
    uuid: z.uuid()
});

export const createPromotionSchema = z
    .object({
        name: z.string().trim().min(2).max(120),
        scope: promotionScopeSchema,
        category: productCategorySchema.optional(),
        discountPercent: z.int().min(1).max(100),
        startsAt: dateTimeSchema,
        endsAt: dateTimeSchema.nullable().optional(),
        isActive: z.boolean().default(true)
    })
    .superRefine((data, ctx) => {
        if (data.scope === "CATEGORY" && !data.category) {
            ctx.addIssue({
                code: "custom",
                message: "Informe a categoria para promocao segmentada",
                path: ["category"]
            });
        }

        if (data.scope === "ALL_PRODUCTS" && data.category) {
            ctx.addIssue({
                code: "custom",
                message: "Promocao para todos os produtos nao deve receber categoria",
                path: ["category"]
            });
        }

        if (data.endsAt && data.endsAt <= data.startsAt) {
            ctx.addIssue({
                code: "custom",
                message: "Fim da promocao deve ser posterior ao inicio",
                path: ["endsAt"]
            });
        }
    });

export const updatePromotionSchema = z
    .object({
        name: z.string().trim().min(2).max(120).optional(),
        scope: promotionScopeSchema.optional(),
        category: productCategorySchema.nullable().optional(),
        discountPercent: z.int().min(1).max(100).optional(),
        startsAt: dateTimeSchema.optional(),
        endsAt: dateTimeSchema.nullable().optional(),
        isActive: z.boolean().optional()
    })
    .refine((data) => Object.keys(data).length > 0, {
        message: "Informe ao menos um campo para atualizacao"
    });
