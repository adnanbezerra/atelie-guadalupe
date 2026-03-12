import { FastifyPluginAsync } from "fastify";
import { AddressController } from "../../addresses/controllers/address-controller";
import { AddressRepository } from "../../addresses/repositories/address-repository";
import { AddressService } from "../../addresses/services/address-service";
import { RoleRepository } from "../../roles/repositories/role-repository";
import { UserController } from "../controllers/user-controller";
import { UserRepository } from "../repositories/user-repository";
import { UserService } from "../services/user-service";

const userRoutes: FastifyPluginAsync = async (fastify) => {
    const userRepository = new UserRepository(fastify.prisma);
    const roleRepository = new RoleRepository(fastify.prisma);
    const addressRepository = new AddressRepository(fastify.prisma);
    const userService = new UserService(userRepository, roleRepository);
    const addressService = new AddressService(userRepository, addressRepository);
    const userController = new UserController(fastify, userService);
    const addressController = new AddressController(fastify, addressService);

    fastify.get("/me", {
        preHandler: [fastify.authenticate]
    }, userController.getMe);

    fastify.patch("/me", {
        preHandler: [fastify.authenticate]
    }, userController.updateMe);

    fastify.post("/", {
        preHandler: [fastify.authenticate, fastify.authorize(["ADMIN"])]
    }, userController.createManagedUser);

    fastify.patch("/:uuid", {
        preHandler: [fastify.authenticate, fastify.authorize(["ADMIN"])]
    }, userController.updateManagedUser);

    fastify.get("/me/addresses", {
        preHandler: [fastify.authenticate]
    }, addressController.listMyAddresses);

    fastify.post("/me/addresses", {
        preHandler: [fastify.authenticate]
    }, addressController.createMyAddress);

    fastify.patch("/me/addresses/:uuid", {
        preHandler: [fastify.authenticate]
    }, addressController.updateMyAddress);

    fastify.delete("/me/addresses/:uuid", {
        preHandler: [fastify.authenticate]
    }, addressController.deleteMyAddress);
};

export default userRoutes;
