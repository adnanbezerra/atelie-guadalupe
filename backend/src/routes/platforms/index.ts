import { FastifyPluginAsync } from "fastify";
import platformRoutes from "../../modules/platforms/routes/platform-routes";

const platformRoutePlugin: FastifyPluginAsync = async (fastify) => {
    await fastify.register(platformRoutes, {
        prefix: "/platforms"
    });
};

export default platformRoutePlugin;
