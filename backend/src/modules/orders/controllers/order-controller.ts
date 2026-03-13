import { FastifyInstance, FastifyReply, FastifyRequest } from "fastify";
import { OrderStatus } from "../../../generated/prisma/enums";
import { sendEither } from "../../../core/http/send-either";
import {
    createOrderSchema,
    orderUuidParamSchema,
    updateOrderStatusSchema
} from "../schemas/order-schema";
import { OrderService } from "../services/order-service";

export class OrderController {
    public constructor(
        private readonly fastify: FastifyInstance,
        private readonly orderService: OrderService
    ) {}

    public create = async (request: FastifyRequest, reply: FastifyReply) => {
        const input = this.fastify.validateSchema(createOrderSchema, request.body);
        const result = await this.orderService.createFromCart(request.currentUser!.sub, input);
        return sendEither(reply, result, 201);
    };

    public list = async (request: FastifyRequest, reply: FastifyReply) => {
        const result = await this.orderService.list({
            sub: request.currentUser!.sub,
            role: request.currentUser!.role
        });
        return sendEither(reply, result);
    };

    public detail = async (request: FastifyRequest, reply: FastifyReply) => {
        const params = this.fastify.validateSchema(orderUuidParamSchema, request.params);
        const result = await this.orderService.detail(
            {
                sub: request.currentUser!.sub,
                role: request.currentUser!.role
            },
            params.uuid
        );
        return sendEither(reply, result);
    };

    public updateStatus = async (request: FastifyRequest, reply: FastifyReply) => {
        const params = this.fastify.validateSchema(orderUuidParamSchema, request.params);
        const input = this.fastify.validateSchema(updateOrderStatusSchema, request.body);
        const result = await this.orderService.updateStatus(
            params.uuid,
            input.status as OrderStatus
        );
        return sendEither(reply, result);
    };

    public cancel = async (request: FastifyRequest, reply: FastifyReply) => {
        const params = this.fastify.validateSchema(orderUuidParamSchema, request.params);
        const result = await this.orderService.cancelOwnOrder(
            request.currentUser!.sub,
            params.uuid
        );
        return sendEither(reply, result);
    };
}
