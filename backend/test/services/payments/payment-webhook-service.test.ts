import * as assert from "node:assert";
import { test } from "node:test";
import {
    PaymentStatus,
    OrderStatus
} from "../../../src/generated/prisma/enums";
import { PaymentWebhookService } from "../../../src/modules/payments/services/payment-webhook-service";

function checkoutPayload(id: string, overrides: Record<string, unknown> = {}) {
    return {
        id,
        event: "checkout.completed",
        data: {
            checkout: {
                id: "bill-1",
                externalId: "order-1",
                amount: 5000,
                paidAmount: 5000,
                ...overrides
            },
            payerInformation: { method: "PIX" }
        }
    };
}

function orderPayment() {
    return {
        id: 3,
        orderId: 7,
        status: PaymentStatus.PENDING,
        expectedAmountInCents: 5000,
        paidAt: null,
        order: {
            uuid: "order-1",
            subtotalInCents: 5000,
            shippingInCents: 0,
            discountInCents: 0,
            totalInCents: 5000,
            user: { name: "Maria", email: "maria@example.com" },
            items: []
        }
    };
}

test("concurrent deliveries with the same event id produce effects once", async () => {
    const event = { processedAt: null as Date | null, error: null as string | null };
    let effectCount = 0;
    let releaseTransaction: (() => void) | undefined;
    const transactionBlocked = new Promise<void>((resolve) => {
        releaseTransaction = resolve;
    });
    const transactionClient = {
        order: { updateMany: async () => ({ count: 1 }) },
        orderPayment: { updateMany: async () => ({ count: 1 }) },
        fulfillmentJob: {
            upsert: async () => {
                effectCount += 1;
            }
        },
        emailJob: {
            upsert: async () => {
                effectCount += 1;
            }
        },
        paymentWebhookEvent: {
            update: async ({ data }: { data: { processedAt: Date; error: null } }) => {
                event.processedAt = data.processedAt;
                event.error = data.error;
            }
        }
    };
    const prisma = {
        paymentWebhookEvent: {
            upsert: async () => ({ ...event }),
            updateMany: async () => {
                if (event.processedAt || event.error === "__PROCESSING__") return { count: 0 };
                event.error = "__PROCESSING__";
                return { count: 1 };
            },
            findUnique: async () => ({ processedAt: event.processedAt }),
            update: async ({ data }: { data: { error: string } }) => {
                event.error = data.error;
            }
        },
        orderPayment: { findUnique: async () => orderPayment() },
        $transaction: async (callback: (tx: typeof transactionClient) => Promise<unknown>) => {
            await transactionBlocked;
            return callback(transactionClient);
        }
    };
    const service = new PaymentWebhookService(prisma as never);

    const first = service.process(checkoutPayload("event-concurrent"));
    await new Promise((resolve) => setImmediate(resolve));
    await assert.rejects(
        service.process(checkoutPayload("event-concurrent")),
        (error: Error & { statusCode?: number }) => error.statusCode === 409
    );
    releaseTransaction?.();
    await first;
    const duplicate = await service.process(checkoutPayload("event-concurrent"));

    assert.deepStrictEqual(duplicate, { duplicate: true });
    assert.equal(effectCount, 2);
});

test("stale webhook processing claim can be recovered after interruption", async () => {
    const updatedAt = new Date(Date.now() - 600_000);
    let processed = false;
    const prisma = {
        paymentWebhookEvent: {
            upsert: async () => ({
                processedAt: null,
                error: "__PROCESSING__",
                updatedAt
            }),
            updateMany: async ({ where }: { where: { OR: Array<Record<string, unknown>> } }) => {
                const staleClause = where.OR[2] as {
                    updatedAt: { lt: Date };
                };
                return { count: updatedAt < staleClause.updatedAt.lt ? 1 : 0 };
            },
            findUnique: async () => ({ processedAt: null }),
            update: async () => {
                processed = true;
            }
        }
    };

    const result = await new PaymentWebhookService(prisma as never).process({
        id: "event-stale",
        event: "customer.future"
    });

    assert.deepStrictEqual(result, { ignored: true });
    assert.equal(processed, true);
});

test("webhook rejects divergent external id, amount and paid amount without effects", async () => {
    for (const [name, override] of [
        ["externalId", { externalId: "another-order" }],
        ["amount", { amount: 5001 }],
        ["paidAmount", { paidAmount: 4999 }]
    ] as const) {
        let effects = 0;
        let recordedError: string | null = null;
        const prisma = {
            paymentWebhookEvent: {
                upsert: async () => ({ processedAt: null }),
                updateMany: async () => ({ count: 1 }),
                update: async ({ data }: { data: { error: string } }) => {
                    recordedError = data.error;
                }
            },
            orderPayment: { findUnique: async () => orderPayment() },
            paymentLink: { findUnique: async () => null },
            $transaction: async () => {
                effects += 1;
            }
        };

        await assert.rejects(
            new PaymentWebhookService(prisma as never).process(
                checkoutPayload(`event-divergent-${name}`, override)
            )
        );
        assert.equal(effects, 0);
        assert.ok(recordedError);
    }
});

test("unknown checkout event is audited and does not block a later event", async () => {
    const processedIds: string[] = [];
    const prisma = {
        paymentWebhookEvent: {
            upsert: async ({ create }: { create: { eventId: string } }) => ({
                processedAt: processedIds.includes(create.eventId) ? new Date() : null
            }),
            updateMany: async () => ({ count: 1 }),
            update: async ({ where }: { where: { eventId: string } }) => {
                processedIds.push(where.eventId);
            }
        },
        orderPayment: { findUnique: async () => orderPayment() }
    };
    const service = new PaymentWebhookService(prisma as never);

    const unknown = await service.process({
        ...checkoutPayload("event-unknown"),
        event: "checkout.future-state"
    });
    const unrelated = await service.process({ id: "event-future", event: "customer.future" });

    assert.deepStrictEqual(unknown, { processed: true });
    assert.deepStrictEqual(unrelated, { ignored: true });
    assert.deepStrictEqual(processedIds, ["event-unknown", "event-future"]);
});

test("transaction failure records error and a later retry can finish", async () => {
    const event = { processedAt: null as Date | null, error: null as string | null };
    let attempts = 0;
    let fulfillmentCount = 0;
    const financial = {
        orderStatus: OrderStatus.AWAITING_PAYMENT as OrderStatus,
        paymentStatus: PaymentStatus.PENDING as PaymentStatus
    };
    const transactionClient = {
        order: {
            updateMany: async () => {
                if (financial.orderStatus !== OrderStatus.AWAITING_PAYMENT) return { count: 0 };
                financial.orderStatus = OrderStatus.PAID;
                return { count: 1 };
            }
        },
        orderPayment: {
            updateMany: async () => {
                financial.paymentStatus = PaymentStatus.PAID;
                return { count: 1 };
            }
        },
        fulfillmentJob: { upsert: async () => (fulfillmentCount += 1) },
        emailJob: {
            upsert: async () => {
                if (attempts === 1) throw new Error("transaction interrupted after mutations");
            }
        },
        paymentWebhookEvent: {
            update: async ({ data }: { data: { processedAt: Date; error: null } }) => {
                event.processedAt = data.processedAt;
                event.error = data.error;
            }
        }
    };
    const prisma = {
        paymentWebhookEvent: {
            upsert: async () => ({ ...event }),
            updateMany: async () => {
                if (event.processedAt || event.error === "__PROCESSING__") return { count: 0 };
                event.error = "__PROCESSING__";
                return { count: 1 };
            },
            findUnique: async () => ({ processedAt: event.processedAt }),
            update: async ({ data }: { data: { error: string } }) => {
                event.error = data.error;
            }
        },
        orderPayment: { findUnique: async () => orderPayment() },
        $transaction: async (callback: (tx: typeof transactionClient) => Promise<unknown>) => {
            attempts += 1;
            const snapshot = { ...financial, fulfillmentCount };
            try {
                return await callback(transactionClient);
            } catch (error) {
                financial.orderStatus = snapshot.orderStatus;
                financial.paymentStatus = snapshot.paymentStatus;
                fulfillmentCount = snapshot.fulfillmentCount;
                throw error;
            }
        }
    };
    const service = new PaymentWebhookService(prisma as never);

    await assert.rejects(service.process(checkoutPayload("event-retry")), /after mutations/);
    assert.equal(event.error, "transaction interrupted after mutations");
    assert.equal(financial.orderStatus, OrderStatus.AWAITING_PAYMENT);
    assert.equal(financial.paymentStatus, PaymentStatus.PENDING);
    assert.equal(fulfillmentCount, 0);
    const retry = await service.process(checkoutPayload("event-retry"));

    assert.deepStrictEqual(retry, { processed: true, orderUuid: "order-1" });
    assert.ok(event.processedAt);
    assert.equal(fulfillmentCount, 1);
    assert.equal(financial.orderStatus, OrderStatus.PAID);
    assert.equal(financial.paymentStatus, PaymentStatus.PAID);
});

test("refund, dispute and lost events persist their financial state", async () => {
    for (const [eventType, status, dateField] of [
        ["checkout.refunded", PaymentStatus.REFUNDED, "refundedAt"],
        ["checkout.disputed", PaymentStatus.DISPUTED, "disputedAt"],
        ["checkout.lost", PaymentStatus.LOST, "lostAt"]
    ] as const) {
        let paymentData: Record<string, unknown> | undefined;
        let eventProcessed = false;
        const prisma = {
            paymentWebhookEvent: {
                upsert: async () => ({ processedAt: null }),
                updateMany: async () => ({ count: 1 }),
                update: async () => {
                    eventProcessed = true;
                }
            },
            orderPayment: {
                findUnique: async () => orderPayment(),
                update: async ({ data }: { data: Record<string, unknown> }) => {
                    paymentData = data;
                }
            },
            $transaction: async (operations: Promise<unknown>[]) => Promise.all(operations)
        };

        const result = await new PaymentWebhookService(prisma as never).process({
            ...checkoutPayload(`event-${status}`),
            event: eventType,
            data: {
                ...checkoutPayload("unused").data,
                refundPublicId: "refund-1",
                reason: "provider reason"
            }
        });

        assert.deepStrictEqual(result, { processed: true });
        assert.equal(paymentData?.status, status);
        assert.equal(paymentData?.refundPublicId, "refund-1");
        assert.ok(paymentData?.[dateField] instanceof Date);
        assert.equal(eventProcessed, true);
    }
});
