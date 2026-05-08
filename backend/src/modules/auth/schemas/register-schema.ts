import { z } from "zod";

export const acceptedPasswordSchema = z
    .string()
    .min(8)
    .max(72)
    .regex(/[A-Z]/, "A senha deve conter ao menos uma letra maiuscula")
    .regex(/[a-z]/, "A senha deve conter ao menos uma letra minuscula")
    .regex(/\d/, "A senha deve conter ao menos um numero")
    .regex(/[^a-zA-Z0-9]/, "A senha deve conter ao menos um caractere especial");

const optionalProfileString = (schema: z.ZodType<string>) =>
    z.string().trim().length(0).transform(() => undefined).or(schema).optional();

export const registerSchema = z.object({
    name: z.string().trim().min(3).max(120),
    email: z.email(),
    document: optionalProfileString(z.string().trim().min(11).max(18)),
    password: acceptedPasswordSchema
});

export const loginSchema = z.object({
    email: z.email(),
    password: z.string().min(8).max(72)
});
