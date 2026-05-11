import { FastifyInstance, FastifyReply, FastifyRequest } from "fastify";
import { AppError } from "../../../core/errors/app-error";
import { sendEither } from "../../../core/http/send-either";
import { UploadVideoInput } from "../../../core/storage/image-storage";
import {
    testimonialUuidParamSchema,
    upsertTestimonialSchema
} from "../schemas/testimonial-schema";
import { TestimonialService } from "../services/testimonial-service";

export class TestimonialController {
    public constructor(
        private readonly fastify: FastifyInstance,
        private readonly testimonialService: TestimonialService
    ) {}

    public listAll = async (_request: FastifyRequest, reply: FastifyReply) => {
        return sendEither(reply, await this.testimonialService.listAll());
    };

    public listActive = async (_request: FastifyRequest, reply: FastifyReply) => {
        return sendEither(reply, await this.testimonialService.listActive());
    };

    public detail = async (request: FastifyRequest, reply: FastifyReply) => {
        const params = this.fastify.validateSchema(testimonialUuidParamSchema, request.params);
        return sendEither(reply, await this.testimonialService.detail(params.uuid));
    };

    public upsert = async (request: FastifyRequest, reply: FastifyReply) => {
        const body = request.isMultipart()
            ? await this.parseMultipartRequest(request)
            : request.body;
        const input = this.fastify.validateSchema(upsertTestimonialSchema, body);
        return sendEither(reply, await this.testimonialService.upsert(input));
    };

    public deactivate = async (request: FastifyRequest, reply: FastifyReply) => {
        const params = this.fastify.validateSchema(testimonialUuidParamSchema, request.params);
        return sendEither(reply, await this.testimonialService.deactivate(params.uuid));
    };

    public delete = async (request: FastifyRequest, reply: FastifyReply) => {
        const params = this.fastify.validateSchema(testimonialUuidParamSchema, request.params);
        return sendEither(reply, await this.testimonialService.delete(params.uuid));
    };

    private async parseMultipartRequest(request: FastifyRequest) {
        const body: Record<string, unknown> = {};
        let video: UploadVideoInput | undefined;

        for await (const part of request.parts()) {
            if (part.type === "file") {
                if (part.fieldname !== "video") {
                    throw AppError.validation("Campo de arquivo invalido");
                }

                if (video) {
                    throw AppError.validation("Envie apenas um video");
                }

                video = {
                    filename: part.filename,
                    contentType: part.mimetype,
                    buffer: await part.toBuffer()
                };
                continue;
            }

            body[part.fieldname] = part.value;
        }

        if (typeof body.isActive === "string") {
            body.isActive = this.parseBoolean(body.isActive, "isActive");
        }

        if (video) {
            body.video = video;
        }

        return body;
    }

    private parseBoolean(value: string, field: string): boolean {
        if (value === "true") {
            return true;
        }

        if (value === "false") {
            return false;
        }

        throw AppError.validation(`Campo ${field} deve ser true ou false`);
    }
}
