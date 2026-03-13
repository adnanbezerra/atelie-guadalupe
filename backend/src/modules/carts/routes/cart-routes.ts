import { FastifyPluginAsync } from "fastify";
import { ProductRepository } from "../../products/repositories/product-repository";
import { UserRepository } from "../../users/repositories/user-repository";
import { CartController } from "../controllers/cart-controller";
import { CartRepository } from "../repositories/cart-repository";
import { CartService } from "../services/cart-service";

const cartRoutes: FastifyPluginAsync = async (fastify) => {
    const userRepository = new UserRepository(fastify.prisma);
    const productRepository = new ProductRepository(fastify.prisma);
    const cartRepository = new CartRepository(fastify.prisma);
    const cartService = new CartService(userRepository, productRepository, cartRepository);
    const controller = new CartController(fastify, cartService);

    fastify.get(
        "/",
        {
            preHandler: [fastify.authenticate]
        },
        controller.getMyCart
    );

    fastify.post(
        "/items",
        {
            preHandler: [fastify.authenticate]
        },
        controller.addItem
    );

    fastify.patch(
        "/items/:uuid",
        {
            preHandler: [fastify.authenticate]
        },
        controller.updateItem
    );

    fastify.delete(
        "/items/:uuid",
        {
            preHandler: [fastify.authenticate]
        },
        controller.removeItem
    );

    fastify.delete(
        "/items",
        {
            preHandler: [fastify.authenticate]
        },
        controller.clear
    );
};

export default cartRoutes;
