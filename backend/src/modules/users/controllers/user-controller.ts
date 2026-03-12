import { FastifyInstance, FastifyReply, FastifyRequest } from "fastify";
import { sendEither } from "../../../core/http/send-either";
import { RoleName } from "../../../generated/prisma/enums";
import { createManagedUserSchema, updateManagedUserSchema, updateMeSchema, uuidParamSchema } from "../schemas/user-schema";
import { UserService } from "../services/user-service";

export class UserController {
    public constructor(
        private readonly fastify: FastifyInstance,
        private readonly userService: UserService
    ) {}

    public getMe = async (request: FastifyRequest, reply: FastifyReply) => {
        const result = await this.userService.getMe(request.currentUser!.sub);
        return sendEither(reply, result);
    };

    public updateMe = async (request: FastifyRequest, reply: FastifyReply) => {
        const input = this.fastify.validateSchema(updateMeSchema, request.body);
        const result = await this.userService.updateMe(request.currentUser!.sub, input);
        return sendEither(reply, result);
    };

    public createManagedUser = async (request: FastifyRequest, reply: FastifyReply) => {
        const input = this.fastify.validateSchema(createManagedUserSchema, request.body);
        const result = await this.userService.createManagedUser({
            ...input,
            role: input.role as RoleName
        });
        return sendEither(reply, result, 201);
    };

    public updateManagedUser = async (request: FastifyRequest, reply: FastifyReply) => {
        const params = this.fastify.validateSchema(uuidParamSchema, request.params);
        const input = this.fastify.validateSchema(updateManagedUserSchema, request.body);
        const result = await this.userService.updateManagedUser(params.uuid, {
            ...input,
            role: input.role as RoleName | undefined
        });
        return sendEither(reply, result);
    };
}
