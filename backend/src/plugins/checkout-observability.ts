import fp from "fastify-plugin";
import { CheckoutObservabilityService } from "../modules/observability/checkout-observability-service";
import {
    checkoutObservabilityEnabled,
    checkoutTelemetry
} from "../modules/observability/checkout-telemetry";

const CHECKOUT_ROUTES = new Set(["/orders/:orderUuid/payment", "/payment-links/:uuid/payment"]);

export default fp(async (fastify) => {
    let timer: NodeJS.Timeout | undefined;
    let inFlight: Promise<unknown> | undefined;

    fastify.addHook("onResponse", async (request, reply) => {
        if (!checkoutObservabilityEnabled()) return;
        const route = request.routeOptions.url;
        if (!route || !CHECKOUT_ROUTES.has(route)) return;
        checkoutTelemetry.recordCheckoutHttp({
            route,
            statusCode: reply.statusCode,
            durationMs: reply.elapsedTime
        });
    });

    fastify.addHook("onReady", async () => {
        if (!checkoutObservabilityEnabled()) return;
        const service = new CheckoutObservabilityService(fastify.prisma, fastify.log);
        const inspect = () => {
            if (inFlight) return inFlight;
            inFlight = service.inspect().finally(() => {
                inFlight = undefined;
            });
            return inFlight;
        };
        await inspect().catch((error) => fastify.log.error(error));
        const intervalMs = Number(process.env.CHECKOUT_OBSERVABILITY_INTERVAL_MS ?? 60000);
        timer = setInterval(
            () => void inspect().catch((error) => fastify.log.error(error)),
            intervalMs
        );
        timer.unref();
    });

    fastify.addHook("onClose", async () => {
        if (timer) clearInterval(timer);
        await inFlight;
    });
});
