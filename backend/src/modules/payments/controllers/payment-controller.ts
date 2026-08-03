import { FastifyInstance, FastifyReply, FastifyRequest } from "fastify";
import { sendEither } from "../../../core/http/send-either";
import { paymentIdempotencyHeaderSchema, paymentOrderParamSchema } from "../payment-schema";
import { PaymentService } from "../services/payment-service";
import { FulfillmentService } from "../services/fulfillment-service";

export class PaymentController {
    public constructor(
        private readonly fastify: FastifyInstance,
        private readonly paymentService: PaymentService,
        private readonly fulfillmentService: FulfillmentService
    ) {}

    public createCheckout = async (request: FastifyRequest, reply: FastifyReply) => {
        const params = this.fastify.validateSchema(paymentOrderParamSchema, request.params);
        const headers = this.fastify.validateSchema(
            paymentIdempotencyHeaderSchema,
            request.headers
        );
        return sendEither(
            reply,
            await this.paymentService.createCheckout(
                request.currentUser!.sub,
                params.orderUuid,
                headers["idempotency-key"]
            )
        );
    };

    public retryFulfillment = async (request: FastifyRequest, reply: FastifyReply) => {
        const params = this.fastify.validateSchema(paymentOrderParamSchema, request.params);
        const found = await this.fulfillmentService.retryOrder(params.orderUuid);
        if (!found) return reply.notFound("Pedido nao encontrado");
        return reply.send({ success: true, data: { scheduled: true } });
    };
}
