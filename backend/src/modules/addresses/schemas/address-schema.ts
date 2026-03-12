import { z } from "zod";

const baseAddressSchema = z.object({
    label: z.string().trim().min(2).max(60).optional(),
    recipient: z.string().trim().min(3).max(120),
    document: z.string().trim().min(11).max(18).optional(),
    zipCode: z.string().trim().min(8).max(9),
    street: z.string().trim().min(2).max(120),
    number: z.string().trim().min(1).max(20),
    complement: z.string().trim().max(120).optional(),
    neighborhood: z.string().trim().min(2).max(120),
    city: z.string().trim().min(2).max(120),
    state: z.string().trim().min(2).max(60),
    country: z.string().trim().min(2).max(60),
    reference: z.string().trim().max(200).optional(),
    isDefault: z.boolean().optional()
});

export const createAddressSchema = baseAddressSchema;

export const updateAddressSchema = baseAddressSchema.partial().refine((data) => Object.keys(data).length > 0, {
    message: "Informe ao menos um campo para atualizacao"
});

export const addressUuidParamSchema = z.object({
    uuid: z.uuid()
});
