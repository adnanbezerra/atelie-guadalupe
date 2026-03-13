import fp from "fastify-plugin";
import { FastifyPluginOptions } from "fastify";
import { ZodError } from "zod";
import { AppError } from "../core/errors/app-error";
import { formatZodIssues } from "../core/http/validation";

export type SupportPluginOptions = FastifyPluginOptions;

export default fp<SupportPluginOptions>(async (fastify) => {
    fastify.decorate("getNow", function () {
        return new Date().toISOString();
    });

    fastify.setErrorHandler((error, request, reply) => {
        request.log.error(error);

        if (error instanceof ZodError) {
            return reply.status(422).send({
                success: false,
                error: {
                    code: "VALIDATION_ERROR",
                    message: "Payload invalido",
                    details: formatZodIssues(error)
                }
            });
        }

        if (error instanceof AppError) {
            return reply.status(error.statusCode).send({
                success: false,
                error: {
                    code: error.code,
                    message: error.message,
                    details: error.details ?? []
                }
            });
        }

        return reply.status(500).send({
            success: false,
            error: {
                code: "INTERNAL_SERVER_ERROR",
                message: "Erro interno do servidor",
                details: []
            }
        });
    });
});

declare module "fastify" {
    export interface FastifyInstance {
        getNow(): string;
    }
}
