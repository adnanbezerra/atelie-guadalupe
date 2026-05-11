import { FastifyPluginAsync } from "fastify";
import testimonialRoutes from "../../modules/testimonials/routes/testimonial-routes";

const testimonialRoutePlugin: FastifyPluginAsync = async (fastify) => {
    await fastify.register(testimonialRoutes);
};

export default testimonialRoutePlugin;
