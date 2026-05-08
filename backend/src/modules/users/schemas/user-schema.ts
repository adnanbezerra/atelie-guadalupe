import { z } from "zod";
import { baseAddressSchema } from "../../addresses/schemas/address-schema";
import { acceptedPasswordSchema } from "../../auth/schemas/register-schema";

const optionalProfileString = (schema: z.ZodType<string>) =>
    z.string().trim().length(0).transform(() => undefined).or(schema).optional();

const stripUndefined = <T extends Record<string, unknown>>(data: T) =>
    Object.fromEntries(
        Object.entries(data).filter(([, value]) => typeof value !== "undefined")
    );

const updateMeAddressSchema = baseAddressSchema
    .partial()
    .extend({
        uuid: z.uuid().optional()
    })
    .refine((data) => Object.keys(data).length > 0, {
        message: "Informe ao menos um campo de endereco para atualizacao"
    });

export const updateMeSchema = z
    .object({
        name: optionalProfileString(z.string().trim().min(3).max(120)),
        email: optionalProfileString(z.email()),
        document: optionalProfileString(z.string().trim().min(11).max(18)),
        phone: optionalProfileString(z.string().trim().min(8).max(30)),
        birthDate: optionalProfileString(z.iso.date()),
        address: updateMeAddressSchema.optional()
    })
    .transform(stripUndefined)
    .refine((data) => Object.keys(data).length > 0, {
        message: "Informe ao menos um campo para atualizacao"
    });

export const myOrdersQuerySchema = z.object({
    page: z.coerce.number().int().min(1).default(1),
    pageSize: z.coerce.number().int().min(1).max(50).default(10)
});

export const changeMyPasswordSchema = z.object({
    email: z.email(),
    currentPassword: z.string(),
    newPassword: acceptedPasswordSchema
});

export const createManagedUserSchema = z.object({
    name: z.string().trim().min(3).max(120),
    email: z.email(),
    document: z.string().trim().min(11).max(18),
    password: acceptedPasswordSchema,
    role: z.enum(["ADMIN", "SUBADMIN", "USER"])
});

export const updateManagedUserSchema = z
    .object({
        name: z.string().trim().min(3).max(120).optional(),
        isActive: z.boolean().optional(),
        role: z.enum(["ADMIN", "SUBADMIN", "USER"]).optional()
    })
    .refine((data) => Object.keys(data).length > 0, {
        message: "Informe ao menos um campo para atualizacao"
    });

export const uuidParamSchema = z.object({
    uuid: z.uuid()
});
