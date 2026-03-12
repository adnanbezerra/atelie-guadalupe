import { FastifyReply } from "fastify";
import { Either, isLeft } from "../either/either";
import { AppError } from "../errors/app-error";

export function sendEither<TData>(reply: FastifyReply, result: Either<AppError, TData>, successStatusCode = 200) {
    if (isLeft(result)) {
        return reply.status(result.value.statusCode).send({
            success: false,
            error: {
                code: result.value.code,
                message: result.value.message,
                details: result.value.details ?? []
            }
        });
    }

    return reply.status(successStatusCode).send({
        success: true,
        data: result.value
    });
}
