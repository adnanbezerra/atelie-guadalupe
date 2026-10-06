import { FastifyPluginAsync } from "fastify";
import adminRoutes from "../../modules/admin/routes/admin-routes";

const adminRoutePlugin: FastifyPluginAsync = async (fastify) => {
    await fastify.register(adminRoutes);
};

export default adminRoutePlugin;
