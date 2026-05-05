import { FastifyPluginAsync } from "fastify";
import orderRoutes from "../../modules/orders/routes/order-routes";

const orderRoutePlugin: FastifyPluginAsync = async (fastify) => {
    await fastify.register(orderRoutes);
};

export default orderRoutePlugin;
