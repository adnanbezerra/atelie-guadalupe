import { FastifyPluginAsync } from "fastify";
import { ProductController } from "../controllers/product-controller";
import { ProductRepository } from "../repositories/product-repository";
import { ProductService } from "../services/product-service";

const productRoutes: FastifyPluginAsync = async (fastify) => {
    const productRepository = new ProductRepository(fastify.prisma);
    const productService = new ProductService(productRepository);
    const controller = new ProductController(fastify, productService);

    fastify.get("/", controller.list);
    fastify.get("/:uuid", controller.detail);

    fastify.post("/", {
        preHandler: [fastify.authenticate, fastify.authorize(["ADMIN", "SUBADMIN"])]
    }, controller.create);

    fastify.patch("/:uuid", {
        preHandler: [fastify.authenticate, fastify.authorize(["ADMIN", "SUBADMIN"])]
    }, controller.update);

    fastify.delete("/:uuid", {
        preHandler: [fastify.authenticate, fastify.authorize(["ADMIN", "SUBADMIN"])]
    }, controller.delete);
};

export default productRoutes;
