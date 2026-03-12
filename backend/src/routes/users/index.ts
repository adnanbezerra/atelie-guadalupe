import { FastifyPluginAsync } from "fastify";
import userRoutes from "../../modules/users/routes/user-routes";

const userRoutePlugin: FastifyPluginAsync = async (fastify) => {
    await fastify.register(userRoutes, {
        prefix: "/users"
    });
};

export default userRoutePlugin;
