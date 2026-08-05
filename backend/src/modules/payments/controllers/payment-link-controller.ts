import { FastifyInstance, FastifyReply, FastifyRequest } from "fastify";
import { sendEither } from "../../../core/http/send-either";
import {
    createPaymentLinkSchema,
    listPaymentLinksQuerySchema,
    paymentLinkUuidParamSchema
} from "../payment-link-schema";
import { PaymentLinkService } from "../services/payment-link-service";

export class PaymentLinkController {
    public constructor(
        private readonly fastify: FastifyInstance,
        private readonly service: PaymentLinkService
    ) {}

    public create = async (request: FastifyRequest, reply: FastifyReply) => {
        const input = this.fastify.validateSchema(createPaymentLinkSchema, request.body);
        return sendEither(reply, await this.service.create(request.currentUser!.sub, input), 201);
    };

    public pay = async (request: FastifyRequest, reply: FastifyReply) => {
        const params = this.fastify.validateSchema(paymentLinkUuidParamSchema, request.params);
        return sendEither(reply, await this.service.pay(params.uuid));
    };

    public list = async (request: FastifyRequest, reply: FastifyReply) => {
        const query = this.fastify.validateSchema(listPaymentLinksQuerySchema, request.query);
        return sendEither(reply, await this.service.list(query));
    };
}
