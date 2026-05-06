import { z } from "zod";
import { acceptedPasswordSchema } from "../../auth/schemas/register-schema";

export const updateMeSchema = z
    .object({
        name: z.string().trim().min(3).max(120).optional()
    })
    .refine((data) => Object.keys(data).length > 0, {
        message: "Informe ao menos um campo para atualizacao"
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
