import fp from "fastify-plugin";
import jwt from "@fastify/jwt";

export default fp(async (fastify) => {
    await fastify.register(jwt, {
        secret: process.env.JWT_SECRET ?? "dev-secret-change-me",
        sign: {
            expiresIn: process.env.JWT_EXPIRES_IN ?? "1d"
        }
    });
});
