import fp from "fastify-plugin";
import cors from "@fastify/cors";

const parseCorsOrigin = (value?: string): string[] | boolean => {
    const origins = value
        ?.split(",")
        .map((origin) => origin.trim())
        .filter(Boolean);

    return origins?.length ? origins : true;
};

export default fp(async (fastify) => {
    await fastify.register(cors, {
        origin: parseCorsOrigin(process.env.CORS_ORIGIN),
        credentials: true
    });
});
