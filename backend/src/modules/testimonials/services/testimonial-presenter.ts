import { TestimonialType } from "../../../generated/prisma/enums";

type TestimonialEntity = {
    uuid: string;
    type: TestimonialType;
    title: string | null;
    text: string | null;
    videoUrl: string | null;
    isActive: boolean;
    createdAt: Date;
    updatedAt: Date;
};

export function presentTestimonial(testimonial: TestimonialEntity) {
    return {
        uuid: testimonial.uuid,
        type: testimonial.type,
        title: testimonial.title,
        text: testimonial.text,
        videoUrl: testimonial.videoUrl,
        isActive: testimonial.isActive,
        createdAt: testimonial.createdAt,
        updatedAt: testimonial.updatedAt
    };
}
