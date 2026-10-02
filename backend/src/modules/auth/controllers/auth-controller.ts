import { FastifyInstance, FastifyReply, FastifyRequest } from "fastify";
import { sendEither } from "../../../core/http/send-either";
import { JwtUserPayload } from "../../../core/security/jwt-user-payload";
import { loginSchema, registerSchema } from "../schemas/register-schema";
import {
    confirmPasswordResetSchema,
    requestPasswordResetSchema
} from "../schemas/password-reset-schema";
import { PasswordResetService } from "../services/password-reset-service";
import { LoginService, RegisterUserService } from "../services/register-user-service";

export class AuthController {
    public constructor(
        private readonly fastify: FastifyInstance,
        private readonly registerUserService: RegisterUserService,
        private readonly loginService: LoginService,
        private readonly passwordResetService: PasswordResetService
    ) {}

    public register = async (request: FastifyRequest, reply: FastifyReply) => {
        const input = this.fastify.validateSchema(registerSchema, request.body);
        const result = await this.registerUserService.execute(input);

        if (!result.success) {
            return sendEither(reply, result, 201);
        }

        const token = await reply.jwtSign(
            this.buildJwtPayload(result.value.user, result.value.authVersion)
        );

        return reply.status(201).send({
            success: true,
            data: {
                user: result.value.user,
                token
            }
        });
    };

    public login = async (request: FastifyRequest, reply: FastifyReply) => {
        const input = this.fastify.validateSchema(loginSchema, request.body);
        const result = await this.loginService.execute(input);

        if (!result.success) {
            return sendEither(reply, result);
        }

        const token = await reply.jwtSign(
            this.buildJwtPayload(result.value.user, result.value.authVersion)
        );

        return reply.status(200).send({
            success: true,
            data: {
                user: result.value.user,
                token
            }
        });
    };

    public requestPasswordReset = async (request: FastifyRequest, reply: FastifyReply) => {
        const input = this.fastify.validateSchema(requestPasswordResetSchema, request.body);
        const result = await this.passwordResetService.request(input);
        return sendEither(reply, result, 202);
    };

    public confirmPasswordReset = async (request: FastifyRequest, reply: FastifyReply) => {
        const input = this.fastify.validateSchema(confirmPasswordResetSchema, request.body);
        const result = await this.passwordResetService.confirm(input);
        return sendEither(reply, result);
    };

    private buildJwtPayload(
        user: {
            uuid: string;
            name: string;
            email: string;
            role: "ADMIN" | "SUBADMIN" | "USER";
        },
        authVersion: number
    ): JwtUserPayload {
        return {
            sub: user.uuid,
            email: user.email,
            role: user.role,
            name: user.name,
            authVersion
        };
    }
}
