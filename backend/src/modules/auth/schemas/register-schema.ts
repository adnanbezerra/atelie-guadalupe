import { z } from "zod";

export const registerSchema = z.object({
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
        .regex(/[^a-zA-Z0-9]/, "A senha deve conter ao menos um caractere especial")
});

export const loginSchema = z.object({
    email: z.email(),
    password: z.string().min(8).max(72)
});
