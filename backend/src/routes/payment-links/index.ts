import { FastifyPluginAsync } from "fastify";
import paymentLinkRoutes from "../../modules/payments/routes/payment-link-routes";

const paymentLinkRoutePlugin: FastifyPluginAsync = async (fastify) => {
    await fastify.register(paymentLinkRoutes);
};

export default paymentLinkRoutePlugin;
