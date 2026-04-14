import { FastifyPluginAsync } from "fastify";
import { PlatformController } from "../controllers/platform-controller";
import { PlatformRepository } from "../repositories/platform-repository";
import { PlatformService } from "../services/platform-service";

const platformRoutes: FastifyPluginAsync = async (fastify) => {
    const platformRepository = new PlatformRepository(fastify.prisma);
    const platformService = new PlatformService(platformRepository);
    const controller = new PlatformController(fastify, platformService);

    fastify.get(
        "/",
        {
            preHandler: [fastify.authenticate, fastify.authorize(["ADMIN", "SUBADMIN"])]
        },
        controller.list
    );

    fastify.get(
        "/:uuid",
        {
            preHandler: [fastify.authenticate, fastify.authorize(["ADMIN", "SUBADMIN"])]
        },
        controller.detail
    );

    fastify.post(
        "/",
        {
            preHandler: [fastify.authenticate, fastify.authorize(["ADMIN", "SUBADMIN"])]
        },
        controller.create
    );

    fastify.patch(
        "/:uuid",
        {
            preHandler: [fastify.authenticate, fastify.authorize(["ADMIN", "SUBADMIN"])]
        },
        controller.update
    );

    fastify.delete(
        "/:uuid",
        {
            preHandler: [fastify.authenticate, fastify.authorize(["ADMIN", "SUBADMIN"])]
        },
        controller.delete
    );
};

export default platformRoutes;
