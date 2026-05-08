import "@fastify/jwt";
import fp from "fastify-plugin";
import { FastifyReply, FastifyRequest } from "fastify";
import { AppError } from "../core/errors/app-error";
import { JwtUserPayload } from "../core/security/jwt-user-payload";

type AllowedRole = "ADMIN" | "SUBADMIN" | "USER";
type JwtVerificationError = Error & {
    code?: string;
};

function isExpiredAccessTokenError(error: unknown): error is JwtVerificationError {
    return (
        error instanceof Error &&
        (error as JwtVerificationError).code === "FST_JWT_AUTHORIZATION_TOKEN_EXPIRED"
    );
}

export default fp(async (fastify) => {
    fastify.decorate(
        "authenticate",
        async function (request: FastifyRequest, _reply: FastifyReply) {
            try {
                const payload = await request.jwtVerify<JwtUserPayload>();
                request.currentUser = payload;
            } catch (error) {
                if (isExpiredAccessTokenError(error)) {
                    throw AppError.unauthorized("Access token expirado");
                }

                throw error;
            }
        }
    );

    fastify.decorate("authorize", function (allowedRoles: AllowedRole[]) {
        return async function (request: FastifyRequest, _reply: FastifyReply) {
            const currentUser = request.currentUser;

            if (!currentUser) {
                throw AppError.unauthorized("Usuario nao autenticado");
            }

            if (!allowedRoles.includes(currentUser.role)) {
                throw AppError.forbidden("Usuario sem permissao para acessar este recurso");
            }
        };
    });
});

declare module "fastify" {
    export interface FastifyInstance {
        authenticate(request: FastifyRequest, reply: FastifyReply): Promise<void>;
        authorize(
            allowedRoles: AllowedRole[]
        ): (request: FastifyRequest, reply: FastifyReply) => Promise<void>;
    }

    export interface FastifyRequest {
        currentUser?: JwtUserPayload;
    }
}
