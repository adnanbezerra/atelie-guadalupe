import fp from "fastify-plugin";
import multipart from "@fastify/multipart";

export default fp(async (fastify) => {
    await fastify.register(multipart, {
        throwFileSizeLimit: true,
        limits: {
            fileSize: 5 * 1024 * 1024,
            files: 1,
            fields: 20,
            parts: 25
        }
    });
});
