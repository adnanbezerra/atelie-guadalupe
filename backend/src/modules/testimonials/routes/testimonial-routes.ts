import { FastifyPluginAsync } from "fastify";
import { TestimonialController } from "../controllers/testimonial-controller";
import { TestimonialRepository } from "../repositories/testimonial-repository";
import { TestimonialService } from "../services/testimonial-service";

const testimonialRoutes: FastifyPluginAsync = async (fastify) => {
    const testimonialRepository = new TestimonialRepository(fastify.prisma);
    const testimonialService = new TestimonialService(
        testimonialRepository,
        fastify.imageStorage
    );
    const controller = new TestimonialController(fastify, testimonialService);
    const adminHandlers = [fastify.authenticate, fastify.authorize(["ADMIN", "SUBADMIN"])];

    fastify.get(
        "/",
        {
            preHandler: adminHandlers
        },
        controller.listAll
    );
    fastify.get("/active", controller.listActive);
    fastify.get(
        "/:uuid",
        {
            preHandler: adminHandlers
        },
        controller.detail
    );
    fastify.put(
        "/",
        {
            preHandler: adminHandlers
        },
        controller.upsert
    );
    fastify.patch(
        "/:uuid/deactivate",
        {
            preHandler: adminHandlers
        },
        controller.deactivate
    );
    fastify.delete(
        "/:uuid",
        {
            preHandler: adminHandlers
        },
        controller.delete
    );
};

export default testimonialRoutes;
