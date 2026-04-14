import { FastifyPluginAsync } from "fastify";
import { PlatformRepository } from "../../platforms/repositories/platform-repository";
import { ShippingController } from "../controllers/shipping-controller";
import { ShippingRepository } from "../repositories/shipping-repository";
import { ShippingService } from "../services/shipping-service";
import { SuperFreteClient } from "../services/superfrete-client";

const shippingRoutes: FastifyPluginAsync = async (fastify) => {
    const shippingRepository = new ShippingRepository(fastify.prisma);
    const platformRepository = new PlatformRepository(fastify.prisma);
    const shippingService = new ShippingService(
        shippingRepository,
        platformRepository,
        SuperFreteClient.fromEnv()
    );
    const controller = new ShippingController(fastify, shippingService);

    fastify.get("/boxes", controller.listBoxes);

    fastify.post(
        "/boxes",
        {
            preHandler: [fastify.authenticate, fastify.authorize(["ADMIN", "SUBADMIN"])]
        },
        controller.createBox
    );

    fastify.patch(
        "/boxes/:uuid",
        {
            preHandler: [fastify.authenticate, fastify.authorize(["ADMIN", "SUBADMIN"])]
        },
        controller.updateBox
    );

    fastify.delete(
        "/boxes/:uuid",
        {
            preHandler: [fastify.authenticate, fastify.authorize(["ADMIN", "SUBADMIN"])]
        },
        controller.deleteBox
    );

    fastify.get(
        "/orders/:orderUuid",
        {
            preHandler: [fastify.authenticate]
        },
        controller.detailOrderShipment
    );

    fastify.post(
        "/orders/:orderUuid/quote",
        {
            preHandler: [fastify.authenticate]
        },
        controller.quoteOrder
    );

    fastify.post(
        "/orders/:orderUuid/checkout",
        {
            preHandler: [fastify.authenticate]
        },
        controller.checkoutOrder
    );

    fastify.post(
        "/orders/:orderUuid/cancel",
        {
            preHandler: [fastify.authenticate, fastify.authorize(["ADMIN", "SUBADMIN"])]
        },
        controller.cancelShipment
    );
};

export default shippingRoutes;
