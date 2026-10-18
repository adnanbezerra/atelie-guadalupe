import { z } from "zod";
import { PaymentLinkStatus } from "../../generated/prisma/enums";

export const createPaymentLinkSchema = z.object({
    amountInCents: z.number().int().positive(),
    description: z.string().trim().min(1).max(500),
    customerEmail: z.email().transform((value) => value.trim().toLowerCase()),
    expiresAt: z.iso.datetime({ offset: true }).optional()
});

export type CreatePaymentLinkInput = z.infer<typeof createPaymentLinkSchema>;

export const payPaymentLinkSchema = z.object({
    customerEmail: z.email().transform((value) => value.trim().toLowerCase())
});

export const paymentLinkUuidParamSchema = z.object({ uuid: z.uuid() });

export const listPaymentLinksQuerySchema = z.object({
    page: z.coerce.number().int().min(1).default(1),
    pageSize: z.coerce.number().int().min(1).max(100).default(20),
    status: z.enum(PaymentLinkStatus).optional()
});

export type ListPaymentLinksInput = z.infer<typeof listPaymentLinksQuerySchema>;
