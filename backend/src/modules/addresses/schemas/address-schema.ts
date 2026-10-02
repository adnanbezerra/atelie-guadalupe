import { z } from "zod";

export const baseAddressSchema = z.object({
    label: z.string().trim().min(2).max(60).optional(),
    document: z.string().trim().min(11).max(18).optional(),
    zipCode: z.string().trim().min(8).max(9),
    street: z.string().trim().min(2).max(50),
    number: z.string().trim().min(1).max(10),
    apartmentNumber: z.string().trim().max(20).optional(),
    complement: z.string().trim().max(20).optional(),
    neighborhood: z.string().trim().min(2).max(50),
    city: z.string().trim().min(2).max(50),
    state: z.string().trim().length(2),
    country: z.string().trim().min(2).max(60),
    reference: z.string().trim().max(200).optional()
});

export const createAddressSchema = baseAddressSchema;

export const updateAddressSchema = baseAddressSchema
    .partial()
    .refine((data) => Object.keys(data).length > 0, {
        message: "Informe ao menos um campo para atualizacao"
    });

export const addressUuidParamSchema = z.object({
    uuid: z.uuid()
});
