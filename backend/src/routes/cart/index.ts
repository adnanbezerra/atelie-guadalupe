import { FastifyPluginAsync } from "fastify";
import cartRoutes from "../../modules/carts/routes/cart-routes";

const cartRoutePlugin: FastifyPluginAsync = async (fastify) => {
    await fastify.register(cartRoutes, {
        prefix: "/cart"
    });
};

export default cartRoutePlugin;
