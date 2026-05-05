import { FastifyPluginAsync } from "fastify";
import productRoutes from "../../modules/products/routes/product-routes";

const productRoutePlugin: FastifyPluginAsync = async (fastify) => {
    await fastify.register(productRoutes);
};

export default productRoutePlugin;
