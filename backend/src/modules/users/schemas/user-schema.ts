import { z } from "zod";

export const updateMeSchema = z
    .object({
        name: z.string().trim().min(3).max(120).optional(),
        password: z
            .string()
            .min(8)
            .max(72)
            .regex(/[A-Z]/, "A senha deve conter ao menos uma letra maiuscula")
            .regex(/[a-z]/, "A senha deve conter ao menos uma letra minuscula")
            .regex(/\d/, "A senha deve conter ao menos um numero")
            .regex(/[^a-zA-Z0-9]/, "A senha deve conter ao menos um caractere especial")
            .optional()
    })
    .refine((data) => Object.keys(data).length > 0, {
        message: "Informe ao menos um campo para atualizacao"
    });

export const createManagedUserSchema = z.object({
    name: z.string().trim().min(3).max(120),
    email: z.email(),
    document: z.string().trim().min(11).max(18),
    password: z
        .string()
        .min(8)
        .max(72)
        .regex(/[A-Z]/, "A senha deve conter ao menos uma letra maiuscula")
        .regex(/[a-z]/, "A senha deve conter ao menos uma letra minuscula")
        .regex(/\d/, "A senha deve conter ao menos um numero")
        .regex(/[^a-zA-Z0-9]/, "A senha deve conter ao menos um caractere especial"),
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
