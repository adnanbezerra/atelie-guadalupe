import { FastifyPluginAsync } from "fastify";
import { DashboardController } from "../controllers/dashboard-controller";
import { DashboardService } from "../services/dashboard-service";

const adminRoutes: FastifyPluginAsync = async (fastify) => {
    const controller = new DashboardController(fastify, new DashboardService(fastify.prisma));

    fastify.get(
        "/dashboard",
        { preHandler: [fastify.authenticate, fastify.authorize(["ADMIN", "SUBADMIN"])] },
        controller.get
    );
};

export default adminRoutes;
