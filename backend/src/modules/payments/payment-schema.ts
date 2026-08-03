import { z } from "zod";

export const paymentOrderParamSchema = z.object({ orderUuid: z.uuid() });
export const paymentIdempotencyHeaderSchema = z.object({ "idempotency-key": z.uuid() });
