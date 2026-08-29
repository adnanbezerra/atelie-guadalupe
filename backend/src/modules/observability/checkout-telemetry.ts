export type ProviderName = "ABACATEPAY" | "SUPERFRETE";

export type ProviderRequestObservation = {
    provider: ProviderName;
    operation: string;
    result: "success" | "error";
    durationMs: number;
    statusCode?: number;
};

type CheckoutHttpObservation = {
    route: string;
    statusCode: number;
    durationMs: number;
    recordedAt: number;
};

type TimedProviderObservation = ProviderRequestObservation & { recordedAt: number };

export type CheckoutTelemetrySnapshot = {
    windowSeconds: number;
    checkoutHttpAttempts: Array<{
        route: string;
        statusCode: number;
        count: number;
        ratePerMinute: number;
    }>;
    providerCheckoutCreations: Array<{
        result: "success" | "error";
        count: number;
        ratePerMinute: number;
    }>;
    providers: Array<{
        provider: ProviderName;
        successCount: number;
        errorCount: number;
        totalCount: number;
        p95DurationMs: number;
    }>;
    droppedObservations: {
        checkoutHttpAttempts: number;
        providerRequests: number;
    };
};

export class CheckoutTelemetry {
    private readonly checkoutHttp: BoundedObservationBuffer<CheckoutHttpObservation>;
    private readonly providerRequests: BoundedObservationBuffer<TimedProviderObservation>;

    public constructor(capacity = 10_000) {
        this.checkoutHttp = new BoundedObservationBuffer(capacity);
        this.providerRequests = new BoundedObservationBuffer(capacity);
    }

    public recordCheckoutHttp(
        input: Omit<CheckoutHttpObservation, "recordedAt">,
        now = Date.now()
    ) {
        this.checkoutHttp.push({ ...input, recordedAt: now });
    }

    public recordProvider(input: ProviderRequestObservation, now = Date.now()) {
        this.providerRequests.push({ ...input, recordedAt: now });
    }

    public snapshot(windowMs: number, now = Date.now()): CheckoutTelemetrySnapshot {
        const cutoff = now - windowMs;
        const checkoutHttp = this.checkoutHttp.valuesSince(cutoff);
        const providerRequests = this.providerRequests.valuesSince(cutoff);

        const httpGroups = new Map<
            string,
            CheckoutTelemetrySnapshot["checkoutHttpAttempts"][number]
        >();
        for (const item of checkoutHttp) {
            const key = `${item.route}:${item.statusCode}`;
            const current = httpGroups.get(key) ?? {
                route: item.route,
                statusCode: item.statusCode,
                count: 0,
                ratePerMinute: 0
            };
            current.count += 1;
            current.ratePerMinute = current.count / (windowMs / 60000);
            httpGroups.set(key, current);
        }

        const creationGroups = new Map<
            ProviderRequestObservation["result"],
            CheckoutTelemetrySnapshot["providerCheckoutCreations"][number]
        >();
        const providerGroups = new Map<
            ProviderName,
            {
                provider: ProviderName;
                successCount: number;
                errorCount: number;
                durations: number[];
            }
        >();
        for (const item of providerRequests) {
            if (item.provider === "ABACATEPAY" && item.operation === "POST /checkouts/create") {
                const creation = creationGroups.get(item.result) ?? {
                    result: item.result,
                    count: 0,
                    ratePerMinute: 0
                };
                creation.count += 1;
                creation.ratePerMinute = creation.count / (windowMs / 60000);
                creationGroups.set(item.result, creation);
            }
            const provider = providerGroups.get(item.provider) ?? {
                provider: item.provider,
                successCount: 0,
                errorCount: 0,
                durations: []
            };
            if (item.result === "success") provider.successCount += 1;
            else provider.errorCount += 1;
            provider.durations.push(item.durationMs);
            providerGroups.set(item.provider, provider);
        }

        return {
            windowSeconds: windowMs / 1000,
            checkoutHttpAttempts: [...httpGroups.values()],
            providerCheckoutCreations: [...creationGroups.values()],
            providers: [...providerGroups.values()].map((provider) => ({
                provider: provider.provider,
                successCount: provider.successCount,
                errorCount: provider.errorCount,
                totalCount: provider.successCount + provider.errorCount,
                p95DurationMs: percentile95(provider.durations)
            })),
            droppedObservations: {
                checkoutHttpAttempts: this.checkoutHttp.droppedCount,
                providerRequests: this.providerRequests.droppedCount
            }
        };
    }
}

class BoundedObservationBuffer<T extends { recordedAt: number }> {
    private readonly items: Array<T | undefined>;
    private start = 0;
    private length = 0;
    public droppedCount = 0;

    public constructor(private readonly capacity: number) {
        if (!Number.isInteger(capacity) || capacity <= 0) {
            throw new Error("Telemetry capacity must be a positive integer");
        }
        this.items = new Array<T | undefined>(capacity);
    }

    public push(item: T) {
        if (this.length < this.capacity) {
            this.items[(this.start + this.length) % this.capacity] = item;
            this.length += 1;
            return;
        }
        this.items[this.start] = item;
        this.start = (this.start + 1) % this.capacity;
        this.droppedCount += 1;
    }

    public valuesSince(cutoff: number) {
        const result: T[] = [];
        for (let index = 0; index < this.length; index += 1) {
            const item = this.items[(this.start + index) % this.capacity];
            if (item && item.recordedAt >= cutoff) result.push(item);
        }
        return result;
    }
}

function percentile95(values: number[]) {
    if (values.length === 0) return 0;
    const sorted = [...values].sort((left, right) => left - right);
    return sorted[Math.ceil(sorted.length * 0.95) - 1];
}

export const checkoutTelemetry = new CheckoutTelemetry();

export function checkoutObservabilityEnabled(environment: NodeJS.ProcessEnv = process.env) {
    return environment.CHECKOUT_OBSERVABILITY_ENABLED !== "false";
}

export function observeProviderRequest(observation: ProviderRequestObservation) {
    if (!checkoutObservabilityEnabled()) return;
    checkoutTelemetry.recordProvider(observation);
}

export function safelyObserveProviderRequest(
    observer: (observation: ProviderRequestObservation) => void,
    observation: ProviderRequestObservation
) {
    try {
        observer(observation);
    } catch {
        // Telemetry is best-effort and must never alter the provider request result.
    }
}
