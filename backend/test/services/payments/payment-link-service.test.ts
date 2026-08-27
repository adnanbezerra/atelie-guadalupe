import * as assert from "node:assert";
import { test } from "node:test";
import { PaymentLinkStatus } from "../../../src/generated/prisma/enums";
import { PaymentLinkService } from "../../../src/modules/payments/services/payment-link-service";
import { PaymentWebhookService } from "../../../src/modules/payments/services/payment-webhook-service";

const creator = {
    uuid: "0195f4aa-7f18-7db5-9f32-06f4a9a2b410",
    name: "Admin",
    email: "admin@test.com"
};

function paymentLink(overrides: Record<string, unknown> = {}) {
    return {
        id: 1,
        uuid: "0195f4aa-7f18-7db5-9f32-06f4a9a2b411",
        createdById: 2,
        amountInCents: 12500,
        description: "Encomenda personalizada",
        expiresAt: null,
        status: PaymentLinkStatus.ACTIVE,
        provider: "ABACATEPAY",
        providerProductId: "prod_1",
        providerCheckoutId: null,
        checkoutUrl: null,
        paidAmountInCents: null,
        providerMethod: null,
        providerProductResponse: null,
        providerCheckoutResponse: null,
        refundPublicId: null,
        refundReason: null,
        paidAt: null,
        refundedAt: null,
        disputedAt: null,
        lostAt: null,
        createdBy: creator,
        createdAt: new Date("2026-08-05T10:00:00.000Z"),
        updatedAt: new Date("2026-08-05T10:00:00.000Z"),
        ...overrides
    };
}

test("admin creates a personalized payment link with amount, description and expiration", async () => {
    let providerInput: Record<string, unknown> | undefined;
    let persistedInput: Record<string, unknown> | undefined;
    const stored = paymentLink({ expiresAt: new Date("2029-08-06T00:00:00.000Z") });
    const prisma = {
        user: { findUnique: async () => ({ id: 2 }) },
        paymentLink: {
            create: async ({ data }: { data: Record<string, unknown> }) => {
                persistedInput = data;
                return stored;
            }
        }
    };
    const provider = {
        createProduct: async (input: Record<string, unknown>) => {
            providerInput = input;
            return { id: "prod_1", ...input };
        }
    };
    const service = new PaymentLinkService(prisma as never, provider as never);

    const result = await service.create(creator.uuid, {
        amountInCents: 12500,
        description: "Encomenda personalizada",
        expiresAt: "2029-08-06T00:00:00.000Z"
    });

    assert.equal(result.success, true);
    assert.equal(providerInput?.price, 12500);
    assert.equal(providerInput?.description, "Encomenda personalizada");
    assert.equal(persistedInput?.amountInCents, 12500);
    assert.deepStrictEqual(persistedInput?.expiresAt, new Date("2029-08-06T00:00:00.000Z"));
});

test("public payment endpoint creates and persists a hosted checkout", async () => {
    const stored = paymentLink();
    let checkoutInput: Record<string, unknown> | undefined;
    const prisma = {
        paymentLink: {
            findUnique: async () => stored,
            updateMany: async () => ({ count: 1 }),
            update: async ({ data }: { data: Record<string, unknown> }) =>
                paymentLink({
                    ...data,
                    providerCheckoutId: "bill_1",
                    checkoutUrl: "https://pay.example/bill_1"
                })
        }
    };
    const provider = {
        createCheckout: async (input: Record<string, unknown>) => {
            checkoutInput = input;
            return {
                id: "bill_1",
                externalId: `payment-link:${stored.uuid}`,
                url: "https://pay.example/bill_1",
                amount: 12500,
                paidAmount: null,
                status: "PENDING"
            };
        }
    };
    const service = new PaymentLinkService(prisma as never, provider as never);

    const result = await service.pay(stored.uuid);

    assert.equal(result.success, true);
    assert.equal(checkoutInput?.externalId, `payment-link:${stored.uuid}`);
    if (result.success) assert.equal(result.value.checkoutUrl, "https://pay.example/bill_1");
});

test("provider timeout leaves payment link creating", async () => {
    let stored = paymentLink();
    const prisma = {
        paymentLink: {
            findUnique: async () => stored,
            updateMany: async () => {
                stored = paymentLink({ ...stored, status: PaymentLinkStatus.CREATING });
                return { count: 1 };
            }
        }
    };
    const provider = {
        createCheckout: async () => {
            throw new Error("timeout after checkout creation");
        }
    };

    await assert.rejects(
        new PaymentLinkService(prisma as never, provider as never).pay(stored.uuid),
        /timeout after checkout creation/
    );
    assert.equal(stored.status, PaymentLinkStatus.CREATING);
});

test("creating retry without a provider result never creates another checkout", async () => {
    const stored = paymentLink({ status: PaymentLinkStatus.CREATING });
    let findCalls = 0;
    let createCalls = 0;
    const prisma = { paymentLink: { findUnique: async () => stored } };
    const provider = {
        findCheckoutByExternalId: async () => {
            findCalls += 1;
            return null;
        },
        createCheckout: async () => {
            createCalls += 1;
        }
    };

    const result = await new PaymentLinkService(prisma as never, provider as never).pay(
        stored.uuid
    );

    assert.equal(result.success, false);
    assert.equal(findCalls, 1);
    assert.equal(createCalls, 0);
    assert.equal(stored.status, PaymentLinkStatus.CREATING);
});

test("expired creating link reconciles checkout without exposing or reopening it", async () => {
    const stored = paymentLink({
        status: PaymentLinkStatus.CREATING,
        expiresAt: new Date("2020-01-01T00:00:00.000Z")
    });
    let persisted: Record<string, unknown> | undefined;
    const prisma = {
        paymentLink: {
            findUnique: async () => stored,
            update: async ({ data }: { data: Record<string, unknown> }) => {
                persisted = data;
                return paymentLink({ ...stored, ...data });
            }
        }
    };
    const provider = {
        findCheckoutByExternalId: async () => ({
            id: "bill_expired",
            externalId: `payment-link:${stored.uuid}`,
            url: "https://pay.example/bill_expired",
            amount: stored.amountInCents,
            paidAmount: null,
            status: "PENDING"
        })
    };

    const result = await new PaymentLinkService(prisma as never, provider as never).pay(
        stored.uuid
    );

    assert.equal(result.success, false);
    assert.equal(persisted?.status, PaymentLinkStatus.EXPIRED);
    assert.equal(persisted?.providerCheckoutId, "bill_expired");
    assert.equal(persisted?.checkoutUrl, "https://pay.example/bill_expired");
});

test("provider response arriving after expiration is tracked but not exposed", async () => {
    const stored = paymentLink({ expiresAt: new Date("2029-01-01T00:00:00.000Z") });
    let persisted: Record<string, unknown> | undefined;
    const prisma = {
        paymentLink: {
            findUnique: async () => stored,
            updateMany: async () => ({ count: 1 }),
            update: async ({ data }: { data: Record<string, unknown> }) => {
                persisted = data;
                return paymentLink({ ...stored, ...data });
            }
        }
    };
    const provider = {
        createCheckout: async () => {
            (stored as { expiresAt: Date | null }).expiresAt = new Date("2020-01-01T00:00:00.000Z");
            return {
                id: "bill_after_expiration",
                externalId: `payment-link:${stored.uuid}`,
                url: "https://pay.example/bill_after_expiration",
                amount: stored.amountInCents,
                paidAmount: null,
                status: "PENDING"
            };
        }
    };

    const result = await new PaymentLinkService(prisma as never, provider as never).pay(
        stored.uuid
    );

    assert.equal(result.success, false);
    assert.equal(persisted?.status, PaymentLinkStatus.EXPIRED);
    assert.equal(persisted?.providerCheckoutId, "bill_after_expiration");
});

test("two concurrent payment calls create at most one provider checkout", async () => {
    let stored = paymentLink();
    let createCalls = 0;
    let releaseCreation: (() => void) | undefined;
    const creationBlocked = new Promise<void>((resolve) => {
        releaseCreation = resolve;
    });
    const prisma = {
        paymentLink: {
            findUnique: async () => stored,
            updateMany: async ({ where }: { where: { status: PaymentLinkStatus } }) => {
                if (stored.status !== where.status) return { count: 0 };
                stored = paymentLink({ ...stored, status: PaymentLinkStatus.CREATING });
                return { count: 1 };
            },
            update: async ({ data }: { data: Record<string, unknown> }) => {
                stored = paymentLink({ ...stored, ...data });
                return stored;
            }
        }
    };
    const provider = {
        createCheckout: async () => {
            createCalls += 1;
            await creationBlocked;
            return {
                id: "bill_only",
                externalId: `payment-link:${stored.uuid}`,
                url: "https://pay.example/bill_only",
                amount: stored.amountInCents,
                paidAmount: null,
                status: "PENDING"
            };
        },
        findCheckoutByExternalId: async () => null
    };
    const service = new PaymentLinkService(prisma as never, provider as never);

    const first = service.pay(stored.uuid);
    await new Promise((resolve) => setImmediate(resolve));
    const second = await service.pay(stored.uuid);
    releaseCreation?.();
    const firstResult = await first;

    assert.equal(firstResult.success, true);
    assert.equal(second.success, false);
    assert.equal(createCalls, 1);
});

test("reconciled checkout with divergent amount stays blocked for manual action", async () => {
    const stored = paymentLink({ status: PaymentLinkStatus.CREATING });
    let persisted: Record<string, unknown> | undefined;
    let createCalls = 0;
    const prisma = {
        paymentLink: {
            findUnique: async () => stored,
            update: async ({ data }: { data: Record<string, unknown> }) => {
                persisted = data;
                return paymentLink({ ...stored, ...data });
            }
        }
    };
    const provider = {
        findCheckoutByExternalId: async () => ({
            id: "bill_wrong_amount",
            externalId: `payment-link:${stored.uuid}`,
            url: "https://pay.example/bill_wrong_amount",
            amount: stored.amountInCents + 1,
            paidAmount: null,
            status: "PENDING"
        }),
        createCheckout: async () => {
            createCalls += 1;
        }
    };

    const result = await new PaymentLinkService(prisma as never, provider as never).pay(
        stored.uuid
    );

    assert.equal(result.success, false);
    assert.equal(persisted?.status, PaymentLinkStatus.CREATING);
    assert.equal(persisted?.providerCheckoutId, "bill_wrong_amount");
    assert.equal(persisted?.checkoutUrl, null);
    assert.equal(createCalls, 0);
});

test("valid late webhook audits an expired payment link as paid", async () => {
    let paymentUpdate: Record<string, unknown> | undefined;
    let eventUpdate: Record<string, unknown> | undefined;
    const expired = paymentLink({
        status: PaymentLinkStatus.EXPIRED,
        providerCheckoutId: "bill_expired_paid",
        checkoutUrl: "https://pay.example/bill_expired_paid"
    });
    const prisma = {
        paymentWebhookEvent: {
            upsert: async () => ({ processedAt: null }),
            update: async ({ data }: { data: Record<string, unknown> }) => {
                eventUpdate = data;
            }
        },
        orderPayment: { findUnique: async () => null },
        paymentLink: {
            findUnique: async () => expired,
            update: async ({ data }: { data: Record<string, unknown> }) => {
                paymentUpdate = data;
            }
        },
        $transaction: async (operations: Promise<unknown>[]) => Promise.all(operations)
    };

    const result = await new PaymentWebhookService(prisma as never).process({
        id: "evt_expired_payment_link_paid",
        event: "checkout.completed",
        data: {
            checkout: {
                id: "bill_expired_paid",
                externalId: `payment-link:${expired.uuid}`,
                amount: expired.amountInCents,
                paidAmount: expired.amountInCents
            },
            payerInformation: { method: "PIX" }
        }
    });

    assert.deepStrictEqual(result, { processed: true, paymentLinkUuid: expired.uuid });
    assert.equal(paymentUpdate?.status, PaymentLinkStatus.PAID);
    assert.equal(paymentUpdate?.paidAmountInCents, expired.amountInCents);
    assert.equal(paymentUpdate?.providerMethod, "PIX");
    assert.ok(paymentUpdate?.paidAt instanceof Date);
    assert.ok(eventUpdate?.processedAt instanceof Date);
    assert.equal(eventUpdate?.error, null);
});

test("expired payment link is blocked before calling the provider", async () => {
    let providerCalled = false;
    const expired = paymentLink({ expiresAt: new Date("2020-01-01T00:00:00.000Z") });
    const prisma = {
        paymentLink: {
            findUnique: async () => expired,
            update: async () => paymentLink({ ...expired, status: PaymentLinkStatus.EXPIRED })
        }
    };
    const provider = {
        createCheckout: async () => {
            providerCalled = true;
        }
    };
    const service = new PaymentLinkService(prisma as never, provider as never);

    const result = await service.pay(expired.uuid);

    assert.equal(result.success, false);
    assert.equal(providerCalled, false);
});

test("public payment endpoint blocks a new checkout without calling the provider when disabled", async () => {
    const previous = process.env.CHECKOUT_ENABLED;
    process.env.CHECKOUT_ENABLED = "false";
    const stored = paymentLink();
    let providerCalled = false;
    const prisma = {
        paymentLink: { findUnique: async () => stored }
    };
    const provider = {
        createCheckout: async () => {
            providerCalled = true;
        },
        findCheckoutByExternalId: async () => {
            providerCalled = true;
        }
    };

    try {
        const result = await new PaymentLinkService(prisma as never, provider as never).pay(
            stored.uuid
        );

        assert.equal(result.success, false);
        if (!result.success) {
            assert.equal(result.value.code, "SERVICE_UNAVAILABLE");
            assert.equal(result.value.statusCode, 503);
        }
        assert.equal(providerCalled, false);
    } finally {
        if (previous === undefined) delete process.env.CHECKOUT_ENABLED;
        else process.env.CHECKOUT_ENABLED = previous;
    }
});

test("public payment endpoint reconciles a creating checkout without creating another while disabled", async () => {
    const previous = process.env.CHECKOUT_ENABLED;
    process.env.CHECKOUT_ENABLED = "false";
    const stored = paymentLink({ status: PaymentLinkStatus.CREATING });
    let findCalls = 0;
    let createCalls = 0;
    const prisma = {
        paymentLink: {
            findUnique: async () => stored,
            update: async ({ data }: { data: Record<string, unknown> }) =>
                paymentLink({ ...stored, ...data })
        }
    };
    const provider = {
        findCheckoutByExternalId: async () => {
            findCalls += 1;
            return {
                id: "bill_reconciled",
                externalId: `payment-link:${stored.uuid}`,
                url: "https://pay.example/bill_reconciled",
                amount: stored.amountInCents,
                paidAmount: null,
                status: "PENDING"
            };
        },
        createCheckout: async () => {
            createCalls += 1;
        }
    };

    try {
        const result = await new PaymentLinkService(prisma as never, provider as never).pay(
            stored.uuid
        );

        assert.equal(result.success, true);
        assert.equal(findCalls, 1);
        assert.equal(createCalls, 0);
        if (result.success) {
            assert.equal(result.value.checkoutUrl, "https://pay.example/bill_reconciled");
        }
    } finally {
        if (previous === undefined) delete process.env.CHECKOUT_ENABLED;
        else process.env.CHECKOUT_ENABLED = previous;
    }
});

test("public payment endpoint returns an existing checkout while new checkouts are disabled", async () => {
    const previous = process.env.CHECKOUT_ENABLED;
    process.env.CHECKOUT_ENABLED = "false";
    const stored = paymentLink({
        status: PaymentLinkStatus.PENDING,
        providerCheckoutId: "bill_in_flight",
        checkoutUrl: "https://pay.example/bill_in_flight"
    });
    const prisma = {
        paymentLink: { findUnique: async () => stored }
    };

    try {
        const result = await new PaymentLinkService(prisma as never, {} as never).pay(stored.uuid);

        assert.equal(result.success, true);
        if (result.success) {
            assert.equal(result.value.checkoutUrl, "https://pay.example/bill_in_flight");
        }
    } finally {
        if (previous === undefined) delete process.env.CHECKOUT_ENABLED;
        else process.env.CHECKOUT_ENABLED = previous;
    }
});

test("admin history is paginated and includes the creator for audit", async () => {
    let findManyInput: Record<string, unknown> | undefined;
    const stored = paymentLink({ status: PaymentLinkStatus.PAID });
    const prisma = {
        paymentLink: {
            updateMany: async () => ({ count: 0 }),
            findMany: async (input: Record<string, unknown>) => {
                findManyInput = input;
                return [stored];
            },
            count: async () => 1
        },
        $transaction: async (operations: Promise<unknown>[]) => Promise.all(operations)
    };
    const service = new PaymentLinkService(prisma as never, {} as never);

    const result = await service.list({
        page: 2,
        pageSize: 10,
        status: PaymentLinkStatus.PAID
    });

    assert.equal(result.success, true);
    assert.equal(findManyInput?.skip, 10);
    assert.equal(findManyInput?.take, 10);
    if (result.success) {
        assert.deepStrictEqual(result.value.items[0]?.createdBy, creator);
        assert.deepStrictEqual(result.value.pagination, {
            page: 2,
            pageSize: 10,
            total: 1,
            totalPages: 1
        });
    }
});
