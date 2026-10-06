import { z } from "zod";

export const dashboardQuerySchema = z
    .object({
        from: z.iso.datetime({ offset: true }),
        to: z.iso.datetime({ offset: true })
    })
    .refine((query) => new Date(query.from) <= new Date(query.to), {
        message: "from deve ser anterior ou igual a to",
        path: ["from"]
    });
