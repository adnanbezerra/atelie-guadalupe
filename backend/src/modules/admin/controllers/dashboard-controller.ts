import { FastifyInstance, FastifyReply, FastifyRequest } from "fastify";
import { dashboardQuerySchema } from "../schemas/dashboard-schema";
import { DashboardService } from "../services/dashboard-service";

export class DashboardController {
    public constructor(
        private readonly fastify: FastifyInstance,
        private readonly dashboardService: DashboardService
    ) {}

    public get = async (request: FastifyRequest, reply: FastifyReply) => {
        const query = this.fastify.validateSchema(dashboardQuerySchema, request.query);
        return reply.send({ success: true, data: await this.dashboardService.get(query) });
    };
}
