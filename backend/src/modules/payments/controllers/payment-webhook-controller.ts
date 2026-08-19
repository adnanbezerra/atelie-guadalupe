import { FastifyReply, FastifyRequest } from "fastify";
import { AppError } from "../../../core/errors/app-error";
import {
    AbacateWebhookPayload,
    PaymentWebhookService,
    verifyAbacateWebhook
} from "../services/payment-webhook-service";

type WebhookQuery = { webhookSecret?: string };

export class PaymentWebhookController {
    public constructor(private readonly service: PaymentWebhookService) {}

    public handle = async (request: FastifyRequest, reply: FastifyReply) => {
        const rawBody = request.body as Buffer;
        const query = request.query as WebhookQuery;
        const expectedSecret = process.env.ABACATEPAY_WEBHOOK_SECRET ?? "";
        const signature = request.headers["x-webhook-signature"];

        if (!expectedSecret || query.webhookSecret !== expectedSecret) {
            throw AppError.unauthorized("Secret de webhook invalido");
        }
        if (typeof signature !== "string" || !verifyAbacateWebhook(rawBody, signature)) {
            throw AppError.unauthorized("Assinatura de webhook invalida");
        }

        let payload: AbacateWebhookPayload;
        try {
            payload = JSON.parse(rawBody.toString("utf8")) as AbacateWebhookPayload;
        } catch {
            throw AppError.validation("Payload de webhook invalido");
        }
        const result = await this.service.process(payload);
        return reply.send({ success: true, data: result });
    };
}
