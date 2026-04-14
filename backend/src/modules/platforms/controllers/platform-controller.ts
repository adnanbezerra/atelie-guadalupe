import { FastifyInstance, FastifyReply, FastifyRequest } from "fastify";
import { sendEither } from "../../../core/http/send-either";
import {
    createPlatformSchema,
    platformUuidParamSchema,
    updatePlatformSchema
} from "../schemas/platform-schema";
import { PlatformService } from "../services/platform-service";

export class PlatformController {
    public constructor(
        private readonly fastify: FastifyInstance,
        private readonly platformService: PlatformService
    ) {}

    public list = async (_request: FastifyRequest, reply: FastifyReply) => {
        return sendEither(reply, await this.platformService.list());
    };

    public detail = async (request: FastifyRequest, reply: FastifyReply) => {
        const params = this.fastify.validateSchema(platformUuidParamSchema, request.params);
        return sendEither(reply, await this.platformService.detail(params.uuid));
    };

    public create = async (request: FastifyRequest, reply: FastifyReply) => {
        const input = this.fastify.validateSchema(createPlatformSchema, request.body);
        return sendEither(reply, await this.platformService.create(input), 201);
    };

    public update = async (request: FastifyRequest, reply: FastifyReply) => {
        const params = this.fastify.validateSchema(platformUuidParamSchema, request.params);
        const input = this.fastify.validateSchema(updatePlatformSchema, request.body);
        return sendEither(reply, await this.platformService.update(params.uuid, input));
    };

    public delete = async (request: FastifyRequest, reply: FastifyReply) => {
        const params = this.fastify.validateSchema(platformUuidParamSchema, request.params);
        return sendEither(reply, await this.platformService.delete(params.uuid));
    };
}
