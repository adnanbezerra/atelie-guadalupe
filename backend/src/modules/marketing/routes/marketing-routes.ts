import { FastifyPluginAsync } from "fastify";
import { MarketingController } from "../controllers/marketing-controller";
import { MarketingRepository } from "../repositories/marketing-repository";
import { MarketingService } from "../services/marketing-service";

const marketingRoutes: FastifyPluginAsync = async (fastify) => {
    const marketingRepository = new MarketingRepository(fastify.prisma);
    const marketingService = new MarketingService(marketingRepository);
    const controller = new MarketingController(fastify, marketingService);

    const adminHandlers = [fastify.authenticate, fastify.authorize(["ADMIN", "SUBADMIN"])];

    fastify.get(
        "/coupons",
        {
            preHandler: adminHandlers
        },
        controller.listCoupons
    );

    fastify.post(
        "/coupons",
        {
            preHandler: adminHandlers
        },
        controller.createCoupon
    );

    fastify.patch(
        "/coupons/:uuid",
        {
            preHandler: adminHandlers
        },
        controller.updateCoupon
    );

    fastify.post(
        "/coupons/:uuid/cancel",
        {
            preHandler: adminHandlers
        },
        controller.cancelCoupon
    );

    fastify.get(
        "/promotions",
        {
            preHandler: adminHandlers
        },
        controller.listPromotions
    );

    fastify.post(
        "/promotions",
        {
            preHandler: adminHandlers
        },
        controller.createPromotion
    );

    fastify.patch(
        "/promotions/:uuid",
        {
            preHandler: adminHandlers
        },
        controller.updatePromotion
    );
};

export default marketingRoutes;
