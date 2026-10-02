import fp from "fastify-plugin";
import rateLimit from "@fastify/rate-limit";
import { AppError } from "../core/errors/app-error";

export default fp(async (fastify) => {
    await fastify.register(rateLimit, {
        max: Number(process.env.RATE_LIMIT_MAX ?? 120),
        timeWindow: process.env.RATE_LIMIT_TIME_WINDOW ?? "1 minute",
        allowList: ["127.0.0.1"],
        addHeadersOnExceeding: {
            "x-ratelimit-limit": true,
            "x-ratelimit-remaining": true,
            "x-ratelimit-reset": true
        },
        errorResponseBuilder: function (_request, context) {
            return new AppError(
                "RATE_LIMIT_EXCEEDED",
                context.statusCode,
                "Muitas tentativas. Tente novamente mais tarde.",
                [
                    {
                        limit: context.max,
                        timeWindow: context.after
                    }
                ]
            );
        }
    });
});
