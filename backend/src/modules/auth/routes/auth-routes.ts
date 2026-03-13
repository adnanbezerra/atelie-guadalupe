import { FastifyPluginAsync } from "fastify";
import { AuthController } from "../controllers/auth-controller";
import { LoginService, RegisterUserService } from "../services/register-user-service";
import { RoleRepository } from "../../roles/repositories/role-repository";
import { UserRepository } from "../../users/repositories/user-repository";

const authRoutes: FastifyPluginAsync = async (fastify) => {
    const roleRepository = new RoleRepository(fastify.prisma);
    const userRepository = new UserRepository(fastify.prisma);
    const registerUserService = new RegisterUserService(roleRepository, userRepository);
    const loginService = new LoginService(userRepository);
    const controller = new AuthController(fastify, registerUserService, loginService);

    fastify.post(
        "/register",
        {
            config: {
                rateLimit: {
                    max: 3,
                    timeWindow: "1 minute"
                }
            }
        },
        controller.register
    );

    fastify.post(
        "/login",
        {
            config: {
                rateLimit: {
                    max: 5,
                    timeWindow: "1 minute"
                }
            }
        },
        controller.login
    );
};

export default authRoutes;
