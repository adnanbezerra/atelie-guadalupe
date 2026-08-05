import * as assert from "node:assert";
import { test } from "node:test";
import { PaymentLinkStatus } from "../../../src/generated/prisma/enums";
import { PaymentLinkService } from "../../../src/modules/payments/services/payment-link-service";

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
