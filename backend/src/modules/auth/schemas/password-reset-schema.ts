import { z } from "zod";
import { acceptedPasswordSchema } from "./register-schema";

export const requestPasswordResetSchema = z.object({
    email: z.email()
});

export const confirmPasswordResetSchema = z.object({
    email: z.email(),
    code: z.string().regex(/^\d{6}$/, "O codigo deve conter exatamente 6 digitos"),
    newPassword: acceptedPasswordSchema
});
