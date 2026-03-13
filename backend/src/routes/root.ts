import { FastifyPluginAsync } from "fastify";

const root: FastifyPluginAsync = async (fastify, _opts): Promise<void> => {
    fastify.get("/", async function () {
        return {
            success: true,
            data: {
                service: "atelie-guadalupe-backend",
                status: "ok",
                timestamp: fastify.getNow()
            }
        };
    });
};

export default root;
