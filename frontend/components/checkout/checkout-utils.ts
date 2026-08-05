import type { Order } from "@/lib/types";

const ACTIVE_ORDER_KEY = "atelie_checkout_active_order";

export const PAYMENT_CONFIRMED_STATUSES = new Set([
    "PAID",
    "PROCESSING",
    "SHIPPED",
    "DELIVERED",
]);

export const PAYMENT_PROBLEM_STATUSES = new Set([
    "REFUNDED",
    "DISPUTED",
    "LOST",
]);

export function idempotencyStorageKey(orderUuid: string) {
    return `checkout:${orderUuid}:key`;
}

export function readStoredOrderUuid() {
    return window.sessionStorage.getItem(ACTIVE_ORDER_KEY);
}

export function storeOrder(order: Order) {
    window.sessionStorage.setItem(ACTIVE_ORDER_KEY, order.uuid);

    if (order.paymentIdempotencyKey) {
        window.sessionStorage.setItem(
            idempotencyStorageKey(order.uuid),
            order.paymentIdempotencyKey,
        );
    }
}

export function getPaymentMessage(order: Order) {
    if (order.status === "CANCELLED") return "Pedido cancelado";
    if (order.status === "DELIVERED") return "Pedido entregue";
    if (order.status === "SHIPPED") return "Pedido enviado";
    if (order.status === "PROCESSING") {
        return "Pagamento confirmado; preparando envio";
    }
    if (
        PAYMENT_CONFIRMED_STATUSES.has(order.status) ||
        order.payment?.status === "PAID"
    ) {
        return "Pagamento confirmado";
    }
    if (order.payment?.status === "REFUNDED") return "Pagamento reembolsado";
    if (order.payment?.status === "DISPUTED") {
        return "Pagamento em disputa; fale com o atendimento";
    }
    if (order.payment?.status === "LOST") {
        return "Disputa encerrada; fale com o atendimento";
    }
    return "Aguardando confirmação do pagamento";
}

export function getDeliveryMessage(order: Order) {
    if (order.status === "DELIVERED") return "Entrega concluída";
    if (order.status === "SHIPPED") return "Seu pedido está a caminho";
    if (
        order.fulfillment?.status === "COMPLETED" ||
        order.shipment?.status === "LABEL_PURCHASED"
    ) {
        return "Etiqueta de envio emitida";
    }
    if (order.fulfillment?.status === "RETRY_SCHEDULED") {
        return "Envio aguardando processamento";
    }
    return "Preparando a etiqueta de envio";
}
