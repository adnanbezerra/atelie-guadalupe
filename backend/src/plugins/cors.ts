import fp from "fastify-plugin";
import cors from "@fastify/cors";

export default fp(async (fastify) => {
    await fastify.register(cors, {
        origin: process.env.CORS_ORIGIN?.split(",") ?? true,
        credentials: true
    });
});
