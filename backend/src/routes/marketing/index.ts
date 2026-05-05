import { FastifyPluginAsync } from "fastify";
import marketingRoutes from "../../modules/marketing/routes/marketing-routes";

const marketingRoutePlugin: FastifyPluginAsync = async (fastify) => {
    await fastify.register(marketingRoutes);
};

export default marketingRoutePlugin;
