import { z } from "zod";
import { baseAddressSchema } from "../../addresses/schemas/address-schema";

const platformAddressSchema = baseAddressSchema.omit({
    isDefault: true
});

export const createPlatformSchema = z.object({
    name: z.string().trim().min(2).max(120),
    email: z.email().optional(),
    phone: z.string().trim().min(8).max(30).optional(),
    document: z.string().trim().min(11).max(18).optional(),
    websiteUrl: z.url().optional(),
    isActive: z.boolean().optional(),
    isDefault: z.boolean().optional(),
    address: platformAddressSchema
});

export const updatePlatformSchema = z
    .object({
        name: z.string().trim().min(2).max(120).optional(),
        email: z.email().nullable().optional(),
        phone: z.string().trim().min(8).max(30).nullable().optional(),
        document: z.string().trim().min(11).max(18).nullable().optional(),
        websiteUrl: z.url().nullable().optional(),
        isActive: z.boolean().optional(),
        isDefault: z.boolean().optional(),
        address: platformAddressSchema.partial().optional()
    })
    .refine((data) => Object.keys(data).length > 0, {
        message: "Informe ao menos um campo para atualizacao"
    });

export const platformUuidParamSchema = z.object({
    uuid: z.uuid()
});
