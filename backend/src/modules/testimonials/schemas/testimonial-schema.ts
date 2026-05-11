import { z } from "zod";

const testimonialTypeSchema = z.enum(["TEXT", "VIDEO"]);
const videoUploadSchema = z.object({
    filename: z.string().trim().min(1).max(255),
    contentType: z.enum(["video/mp4", "video/webm", "video/quicktime"]),
    buffer: z.instanceof(Buffer)
});

export const testimonialUuidParamSchema = z.object({
    uuid: z.uuid()
});

export const upsertTestimonialSchema = z
    .object({
        uuid: z.uuid().optional(),
        type: testimonialTypeSchema,
        text: z.string().trim().min(1).max(20000).optional(),
        video: videoUploadSchema.optional(),
        isActive: z.boolean().default(true)
    })
    .superRefine((data, ctx) => {
        if (data.type === "TEXT" && !data.text) {
            ctx.addIssue({
                code: "custom",
                message: "Informe o texto do testemunho",
                path: ["text"]
            });
        }
    });
