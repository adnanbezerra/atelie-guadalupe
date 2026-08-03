import { FastifyPluginAsync } from "fastify";
import { AddressRepository } from "../../addresses/repositories/address-repository";
import { CartRepository } from "../../carts/repositories/cart-repository";
import { MarketingRepository } from "../../marketing/repositories/marketing-repository";
import { UserRepository } from "../../users/repositories/user-repository";
import { PaymentController } from "../../payments/controllers/payment-controller";
import { AbacatePayClient } from "../../payments/services/abacatepay-client";
import { FulfillmentService } from "../../payments/services/fulfillment-service";
import { PaymentService } from "../../payments/services/payment-service";
import { OrderController } from "../controllers/order-controller";
import { OrderRepository } from "../repositories/order-repository";
import { OrderService } from "../services/order-service";

const orderRoutes: FastifyPluginAsync = async (fastify) => {
    const userRepository = new UserRepository(fastify.prisma);
    const addressRepository = new AddressRepository(fastify.prisma);
    const cartRepository = new CartRepository(fastify.prisma);
    const marketingRepository = new MarketingRepository(fastify.prisma);
    const orderRepository = new OrderRepository(fastify.prisma);
    const orderService = new OrderService(
        userRepository,
        addressRepository,
        cartRepository,
        orderRepository,
        marketingRepository
    );
    const controller = new OrderController(fastify, orderService);
    const fulfillmentService = new FulfillmentService(fastify.prisma);
    const paymentController = new PaymentController(
        fastify,
        new PaymentService(fastify.prisma, AbacatePayClient.fromEnv()),
        fulfillmentService
    );

    fastify.post(
        "/",
        {
            preHandler: [fastify.authenticate]
        },
        controller.create
    );

    fastify.post(
        "/:orderUuid/payment",
        {
            preHandler: [fastify.authenticate]
        },
        paymentController.createCheckout
    );

    fastify.post(
        "/:orderUuid/fulfillment/retry",
        {
            preHandler: [fastify.authenticate, fastify.authorize(["ADMIN", "SUBADMIN"])]
        },
        paymentController.retryFulfillment
    );
    fastify.get(
        "/",
        {
            preHandler: [fastify.authenticate]
        },
        controller.list
    );

    fastify.get(
        "/:uuid",
        {
            preHandler: [fastify.authenticate]
        },
        controller.detail
    );

    fastify.patch(
        "/:uuid/status",
        {
            preHandler: [fastify.authenticate, fastify.authorize(["ADMIN", "SUBADMIN"])]
        },
        controller.updateStatus
    );

    fastify.patch(
        "/:uuid/cancel",
        {
            preHandler: [fastify.authenticate]
        },
        controller.cancel
    );
};

export default orderRoutes;
