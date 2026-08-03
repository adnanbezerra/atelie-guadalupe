import { FastifyPluginAsync } from "fastify";
import { PaymentWebhookController } from "../../modules/payments/controllers/payment-webhook-controller";
import { PaymentWebhookService } from "../../modules/payments/services/payment-webhook-service";

const webhookRoutes: FastifyPluginAsync = async (fastify) => {
    fastify.removeContentTypeParser("application/json");
    fastify.addContentTypeParser(
        "application/json",
        { parseAs: "buffer" },
        (_request, body, done) => {
            done(null, body);
        }
    );

    const controller = new PaymentWebhookController(new PaymentWebhookService(fastify.prisma));
    fastify.post("/abacatepay", controller.handle);
};

export default webhookRoutes;
