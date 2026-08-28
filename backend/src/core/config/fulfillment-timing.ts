export const FULFILLMENT_MAX_PROVIDER_REQUESTS = 4;
export const FULFILLMENT_TRANSACTION_MARGIN_MS = 10_000;

export function minimumFulfillmentTransactionTimeoutMs(providerRequestTimeoutMs: number) {
    return (
        providerRequestTimeoutMs * FULFILLMENT_MAX_PROVIDER_REQUESTS +
        FULFILLMENT_TRANSACTION_MARGIN_MS
    );
}

export function minimumFulfillmentWorkerLockTimeoutMs(transactionTimeoutMs: number) {
    return transactionTimeoutMs + FULFILLMENT_TRANSACTION_MARGIN_MS;
}
