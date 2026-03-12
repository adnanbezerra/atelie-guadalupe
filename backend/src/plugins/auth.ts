import "@fastify/jwt";
import fp from "fastify-plugin";
import { FastifyReply, FastifyRequest } from "fastify";
import { AppError } from "../core/errors/app-error";
import { JwtUserPayload } from "../core/security/jwt-user-payload";

type AllowedRole = "ADMIN" | "SUBADMIN" | "USER";

export default fp(async (fastify) => {
    fastify.decorate("authenticate", async function (request: FastifyRequest, _reply: FastifyReply) {
        const payload = await request.jwtVerify<JwtUserPayload>();
        request.currentUser = payload;
    });

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
        authorize(allowedRoles: AllowedRole[]): (request: FastifyRequest, reply: FastifyReply) => Promise<void>;
    }

    export interface FastifyRequest {
        currentUser?: JwtUserPayload;
    }
}
