import { FastifyPluginAsync } from "fastify";
import { PaymentLinkController } from "../controllers/payment-link-controller";
import { AbacatePayClient } from "../services/abacatepay-client";
import { PaymentLinkService } from "../services/payment-link-service";

const paymentLinkRoutes: FastifyPluginAsync = async (fastify) => {
    const controller = new PaymentLinkController(
        fastify,
        new PaymentLinkService(fastify.prisma, AbacatePayClient.fromEnv())
    );
    const adminHandlers = [fastify.authenticate, fastify.authorize(["ADMIN", "SUBADMIN"])];

    fastify.post("/", { preHandler: adminHandlers }, controller.create);
    fastify.get("/", { preHandler: adminHandlers }, controller.list);
    fastify.post("/:uuid/payment", controller.pay);
};

export default paymentLinkRoutes;
