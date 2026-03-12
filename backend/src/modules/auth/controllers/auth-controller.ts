import { FastifyInstance, FastifyReply, FastifyRequest } from "fastify";
import { sendEither } from "../../../core/http/send-either";
import { JwtUserPayload } from "../../../core/security/jwt-user-payload";
import { loginSchema, registerSchema } from "../schemas/register-schema";
import { LoginService, RegisterUserService } from "../services/register-user-service";

export class AuthController {
    public constructor(
        private readonly fastify: FastifyInstance,
        private readonly registerUserService: RegisterUserService,
        private readonly loginService: LoginService
    ) {}

    public register = async (request: FastifyRequest, reply: FastifyReply) => {
        const input = this.fastify.validateSchema(registerSchema, request.body);
        const result = await this.registerUserService.execute(input);

        if (!result.success) {
            return sendEither(reply, result, 201);
        }

        const token = await reply.jwtSign(this.buildJwtPayload(result.value.user));

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

        const token = await reply.jwtSign(this.buildJwtPayload(result.value.user));

        return reply.status(200).send({
            success: true,
            data: {
                user: result.value.user,
                token
            }
        });
    };

    private buildJwtPayload(user: {
        uuid: string;
        name: string;
        email: string;
        role: "ADMIN" | "SUBADMIN" | "USER";
    }): JwtUserPayload {
        return {
            sub: user.uuid,
            email: user.email,
            role: user.role,
            name: user.name
        };
    }
}
