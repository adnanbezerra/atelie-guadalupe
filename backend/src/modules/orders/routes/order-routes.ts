import { FastifyPluginAsync } from "fastify";
import { AddressRepository } from "../../addresses/repositories/address-repository";
import { CartRepository } from "../../carts/repositories/cart-repository";
import { UserRepository } from "../../users/repositories/user-repository";
import { OrderController } from "../controllers/order-controller";
import { OrderRepository } from "../repositories/order-repository";
import { OrderService } from "../services/order-service";

const orderRoutes: FastifyPluginAsync = async (fastify) => {
    const userRepository = new UserRepository(fastify.prisma);
    const addressRepository = new AddressRepository(fastify.prisma);
    const cartRepository = new CartRepository(fastify.prisma);
    const orderRepository = new OrderRepository(fastify.prisma);
    const orderService = new OrderService(userRepository, addressRepository, cartRepository, orderRepository);
    const controller = new OrderController(fastify, orderService);

    fastify.post("/", {
        preHandler: [fastify.authenticate]
    }, controller.create);

    fastify.get("/", {
        preHandler: [fastify.authenticate]
    }, controller.list);

    fastify.get("/:uuid", {
        preHandler: [fastify.authenticate]
    }, controller.detail);

    fastify.patch("/:uuid/status", {
        preHandler: [fastify.authenticate, fastify.authorize(["ADMIN", "SUBADMIN"])]
    }, controller.updateStatus);

    fastify.patch("/:uuid/cancel", {
        preHandler: [fastify.authenticate]
    }, controller.cancel);
};

export default orderRoutes;
