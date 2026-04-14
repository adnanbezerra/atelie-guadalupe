import { FastifyInstance, FastifyReply, FastifyRequest } from "fastify";
import { sendEither } from "../../../core/http/send-either";
import {
    createShippingBoxSchema,
    quoteOrderShipmentSchema,
    shippingBoxParamSchema,
    shippingOrderParamSchema,
    updateShippingBoxSchema
} from "../schemas/shipping-schema";
import { ShippingService } from "../services/shipping-service";

export class ShippingController {
    public constructor(
        private readonly fastify: FastifyInstance,
        private readonly shippingService: ShippingService
    ) {}

    public listBoxes = async (_request: FastifyRequest, reply: FastifyReply) => {
        return sendEither(reply, await this.shippingService.listBoxes());
    };

    public createBox = async (request: FastifyRequest, reply: FastifyReply) => {
        const input = this.fastify.validateSchema(createShippingBoxSchema, request.body);
        return sendEither(reply, await this.shippingService.createBox(input), 201);
    };

    public updateBox = async (request: FastifyRequest, reply: FastifyReply) => {
        const params = this.fastify.validateSchema(shippingBoxParamSchema, request.params);
        const input = this.fastify.validateSchema(updateShippingBoxSchema, request.body);
        return sendEither(reply, await this.shippingService.updateBox(params.uuid, input));
    };

    public deleteBox = async (request: FastifyRequest, reply: FastifyReply) => {
        const params = this.fastify.validateSchema(shippingBoxParamSchema, request.params);
        return sendEither(reply, await this.shippingService.deleteBox(params.uuid));
    };

    public detailOrderShipment = async (request: FastifyRequest, reply: FastifyReply) => {
        const params = this.fastify.validateSchema(shippingOrderParamSchema, request.params);
        return sendEither(
            reply,
            await this.shippingService.detailOrderShipment(
                {
                    sub: request.currentUser!.sub,
                    role: request.currentUser!.role
                },
                params.orderUuid
            )
        );
    };

    public quoteOrder = async (request: FastifyRequest, reply: FastifyReply) => {
        const params = this.fastify.validateSchema(shippingOrderParamSchema, request.params);
        const input = this.fastify.validateSchema(quoteOrderShipmentSchema, request.body);
        return sendEither(
            reply,
            await this.shippingService.quoteOrder(
                {
                    sub: request.currentUser!.sub,
                    role: request.currentUser!.role
                },
                params.orderUuid,
                input
            )
        );
    };

    public checkoutOrder = async (request: FastifyRequest, reply: FastifyReply) => {
        const params = this.fastify.validateSchema(shippingOrderParamSchema, request.params);
        return sendEither(
            reply,
            await this.shippingService.checkoutOrder(
                {
                    sub: request.currentUser!.sub,
                    role: request.currentUser!.role
                },
                params.orderUuid
            )
        );
    };

    public cancelShipment = async (request: FastifyRequest, reply: FastifyReply) => {
        const params = this.fastify.validateSchema(shippingOrderParamSchema, request.params);
        return sendEither(
            reply,
            await this.shippingService.cancelShipment(
                {
                    sub: request.currentUser!.sub,
                    role: request.currentUser!.role
                },
                params.orderUuid
            )
        );
    };
}
