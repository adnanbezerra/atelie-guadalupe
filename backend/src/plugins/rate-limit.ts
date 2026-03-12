import fp from "fastify-plugin";
import rateLimit from "@fastify/rate-limit";

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
            return {
                success: false,
                error: {
                    code: "RATE_LIMIT_EXCEEDED",
                    message: "Limite de requisicoes excedido",
                    details: [
                        {
                            limit: context.max,
                            timeWindow: context.after
                        }
                    ]
                }
            };
        }
    });
});
