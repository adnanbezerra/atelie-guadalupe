import { TestimonialType } from "../../../generated/prisma/enums";
import { Either, left, right } from "../../../core/either/either";
import { AppError } from "../../../core/errors/app-error";
import { UploadVideoInput, ImageStorage } from "../../../core/storage/image-storage";
import { createUuid } from "../../../core/utils/uuid";
import { TestimonialRepository } from "../repositories/testimonial-repository";
import { presentTestimonial } from "./testimonial-presenter";

type UpsertTestimonialInput = {
    uuid?: string;
    type: TestimonialType;
    title?: string;
    text?: string;
    video?: UploadVideoInput;
    isActive: boolean;
};

export class TestimonialService {
    public constructor(
        private readonly testimonialRepository: TestimonialRepository,
        private readonly imageStorage: ImageStorage
    ) {}

    public async listAll(): Promise<
        Either<AppError, { testimonials: Array<ReturnType<typeof presentTestimonial>> }>
    > {
        const testimonials = await this.testimonialRepository.listAll();

        return right({
            testimonials: testimonials.map((testimonial) => presentTestimonial(testimonial))
        });
    }

    public async listActive(): Promise<
        Either<AppError, { testimonials: Array<ReturnType<typeof presentTestimonial>> }>
    > {
        const testimonials = await this.testimonialRepository.listActive();

        return right({
            testimonials: testimonials.map((testimonial) => presentTestimonial(testimonial))
        });
    }

    public async detail(
        testimonialUuid: string
    ): Promise<Either<AppError, { testimonial: ReturnType<typeof presentTestimonial> }>> {
        const testimonial = await this.testimonialRepository.findByUuid(testimonialUuid);
        if (!testimonial) {
            return left(AppError.notFound("Testemunho nao encontrado"));
        }

        return right({
            testimonial: presentTestimonial(testimonial)
        });
    }

    public async upsert(
        input: UpsertTestimonialInput
    ): Promise<Either<AppError, { testimonial: ReturnType<typeof presentTestimonial> }>> {
        const uuid = input.uuid ?? createUuid();
        const existing = input.uuid
            ? await this.testimonialRepository.findByUuid(input.uuid)
            : null;

        if (input.uuid && !existing) {
            return left(AppError.notFound("Testemunho nao encontrado"));
        }

        let videoUrl: string | null | undefined;
        if (input.type === "VIDEO") {
            if (input.video) {
                videoUrl = await this.imageStorage.uploadTestimonialVideo(input.video);
            } else if (existing?.videoUrl) {
                videoUrl = existing.videoUrl;
            } else {
                return left(AppError.validation("Informe o video do testemunho"));
            }
        }

        if (existing?.videoUrl && (input.type === "TEXT" || input.video)) {
            await this.imageStorage.deleteTestimonialVideoByUrl(existing.videoUrl);
        }

        const testimonial = await this.testimonialRepository.upsert({
            uuid,
            create: {
                uuid,
                type: input.type,
                title: input.title?.trim() ?? null,
                text: input.type === "TEXT" ? input.text?.trim() : null,
                videoUrl: input.type === "VIDEO" ? videoUrl : null,
                isActive: input.isActive
            },
            update: {
                type: input.type,
                title: input.title?.trim() ?? null,
                text: input.type === "TEXT" ? input.text?.trim() : null,
                videoUrl: input.type === "VIDEO" ? videoUrl : null,
                isActive: input.isActive
            }
        });

        return right({
            testimonial: presentTestimonial(testimonial)
        });
    }

    public async deactivate(
        testimonialUuid: string
    ): Promise<Either<AppError, { testimonial: ReturnType<typeof presentTestimonial> }>> {
        const existing = await this.testimonialRepository.findByUuid(testimonialUuid);
        if (!existing) {
            return left(AppError.notFound("Testemunho nao encontrado"));
        }

        const testimonial = await this.testimonialRepository.deactivateByUuid(testimonialUuid);

        return right({
            testimonial: presentTestimonial(testimonial)
        });
    }

    public async delete(testimonialUuid: string): Promise<Either<AppError, { deleted: true }>> {
        const existing = await this.testimonialRepository.findByUuid(testimonialUuid);
        if (!existing) {
            return left(AppError.notFound("Testemunho nao encontrado"));
        }

        if (existing.videoUrl) {
            await this.imageStorage.deleteTestimonialVideoByUrl(existing.videoUrl);
        }

        await this.testimonialRepository.deleteByUuid(testimonialUuid);

        return right({
            deleted: true as const
        });
    }
}
