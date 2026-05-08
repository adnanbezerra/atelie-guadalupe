import { FastifyPluginAsync } from "fastify";
import { AddressRepository } from "../../addresses/repositories/address-repository";
import { CartRepository } from "../../carts/repositories/cart-repository";
import { MarketingRepository } from "../../marketing/repositories/marketing-repository";
import { OrderRepository } from "../../orders/repositories/order-repository";
import { OrderService } from "../../orders/services/order-service";
import { RoleRepository } from "../../roles/repositories/role-repository";
import { UserController } from "../controllers/user-controller";
import { UserRepository } from "../repositories/user-repository";
import { UserService } from "../services/user-service";

const userRoutes: FastifyPluginAsync = async (fastify) => {
    const userRepository = new UserRepository(fastify.prisma);
    const roleRepository = new RoleRepository(fastify.prisma);
    const addressRepository = new AddressRepository(fastify.prisma);
    const cartRepository = new CartRepository(fastify.prisma);
    const marketingRepository = new MarketingRepository(fastify.prisma);
    const orderRepository = new OrderRepository(fastify.prisma);
    const userService = new UserService(userRepository, roleRepository, addressRepository);
    const orderService = new OrderService(
        userRepository,
        addressRepository,
        cartRepository,
        orderRepository,
        marketingRepository
    );
    const userController = new UserController(fastify, userService, orderService);

    fastify.get(
        "/me",
        {
            preHandler: [fastify.authenticate]
        },
        userController.getMe
    );

    fastify.patch(
        "/me",
        {
            preHandler: [fastify.authenticate]
        },
        userController.updateMe
    );

    fastify.get(
        "/me/orders",
        {
            preHandler: [fastify.authenticate]
        },
        userController.listMyOrders
    );

    fastify.patch(
        "/password",
        {
            config: {
                rateLimit: {
                    max: 5,
                    timeWindow: "1 minute"
                }
            }
        },
        userController.changeMyPassword
    );

    fastify.post(
        "/",
        {
            preHandler: [fastify.authenticate, fastify.authorize(["ADMIN"])]
        },
        userController.createManagedUser
    );

    fastify.patch(
        "/:uuid",
        {
            preHandler: [fastify.authenticate, fastify.authorize(["ADMIN"])]
        },
        userController.updateManagedUser
    );
};

export default userRoutes;
