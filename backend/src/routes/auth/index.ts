import { FastifyPluginAsync } from "fastify";
import authRoutes from "../../modules/auth/routes/auth-routes";

const authRoutePlugin: FastifyPluginAsync = async (fastify) => {
    await fastify.register(authRoutes, {
        prefix: "/auth"
    });
};

export default authRoutePlugin;
