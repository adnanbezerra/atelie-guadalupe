import { FastifyPluginAsync } from "fastify";
import shippingRoutes from "../../modules/shipping/routes/shipping-routes";

const shippingRoutePlugin: FastifyPluginAsync = async (fastify) => {
    await fastify.register(shippingRoutes, {
        prefix: "/shipping"
    });
};

export default shippingRoutePlugin;
