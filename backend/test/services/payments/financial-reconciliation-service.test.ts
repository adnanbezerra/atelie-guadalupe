import * as assert from "node:assert";
import { test } from "node:test";
import { AbacateCheckout } from "../../../src/modules/payments/services/abacatepay-client";
import {
    FinancialReconciliationLocalSource,
    FinancialReconciliationService,
    LocalPaidOrder,
    LocalReconciliationPayment,
    PrismaFinancialReconciliationSource
} from "../../../src/modules/payments/services/financial-reconciliation-service";

const paidAt = new Date("2026-08-27T12:00:00.000Z");

function payment(overrides: Partial<LocalReconciliationPayment> = {}): LocalReconciliationPayment {
    return {
        orderUuid: "order-1",
        orderStatus: "PAID",
        providerCheckoutId: "bill-1",
        status: "PAID",
        expectedAmountInCents: 1000,
        paidAmountInCents: 1000,
        paidAt,
        refundedAt: null,
        updatedAt: paidAt,
        ...overrides
    };
}

function checkout(overrides: Partial<AbacateCheckout> = {}): AbacateCheckout {
    return {
        id: "bill-1",
        externalId: "order-1",
        url: "https://example.test/checkout",
        amount: 1000,
        paidAmount: 1000,
        status: "PAID",
        devMode: true,
        createdAt: "2026-08-27T11:50:00.000Z",
        updatedAt: paidAt.toISOString(),
        ...overrides
    };
}

function service(input: {
    payments?: LocalReconciliationPayment[];
    paidOrders?: LocalPaidOrder[];
    checkouts?: AbacateCheckout[];
    resolutions?: ConstructorParameters<typeof FinancialReconciliationService>[2]["resolutions"];
}) {
    const payments = input.payments ?? [];
    const local: FinancialReconciliationLocalSource = {
        listPayments: async () => payments,
        listPaidOrders: async () =>
            input.paidOrders ??
            payments
                .filter((item) => item.orderStatus === "PAID")
                .map((item) => ({ orderUuid: item.orderUuid, payment: item }))
    };
    return new FinancialReconciliationService(
        local,
        { listCheckouts: async () => input.checkouts ?? [] },
        {
            owner: "finance-team",
            periodFrom: new Date("2026-08-27T00:00:00.000Z"),
            periodTo: new Date("2026-08-28T00:00:00.000Z"),
            generatedAt: new Date("2026-08-28T01:00:00.000Z"),
            resolutions: input.resolutions
        }
    );
}

test("financial reconciliation returns empty read-only report for matching payment", async () => {
    const report = await service({ payments: [payment()], checkouts: [checkout()] }).run();

    assert.equal(report.summary.divergences, 0);
    assert.equal(report.audit.readOnly, true);
    assert.equal(report.audit.containsPii, false);
    assert.equal(report.summary.providerCheckoutsRead, 1);
    assert.equal(report.summary.localPaymentsRead, 1);
});

test("financial reconciliation excludes custom payment links from OrderPayment scope", async () => {
    const report = await service({
        checkouts: [
            checkout({
                id: "bill-link",
                externalId: "payment-link:123e4567-e89b-12d3-a456-426614174000"
            })
        ]
    }).run();

    assert.equal(report.summary.divergences, 0);
    assert.equal(report.summary.providerCheckoutsRead, 1);
});

test("financial reconciliation never exposes arbitrary provider externalId", async () => {
    const report = await service({
        checkouts: [checkout({ externalId: "customer@example.test" })]
    }).run();

    assert.equal(report.divergences[0].provider?.externalId, null);
    assert.equal(JSON.stringify(report).includes("customer@example.test"), false);
});

test("financial reconciliation exposes only official checkout ids and hashes arbitrary ids", async () => {
    const arbitrary = await service({
        checkouts: [checkout({ id: "customer123", externalId: "customer@example.test" })]
    }).run();
    const official = await service({
        checkouts: [checkout({ id: "bill_AbC123", externalId: "customer@example.test" })]
    }).run();

    assert.match(arbitrary.divergences[0].providerCheckoutId ?? "", /^sha256:[a-f0-9]{20}$/);
    assert.equal(JSON.stringify(arbitrary).includes("customer123"), false);
    assert.equal(official.divergences[0].providerCheckoutId, "bill_AbC123");
});

test("financial reconciliation correlates order externalId when local provider id is missing", async () => {
    const report = await service({
        payments: [payment({ providerCheckoutId: null })],
        checkouts: [checkout()]
    }).run();

    assert.deepEqual(
        report.divergences.map((item) => item.type),
        ["LOCAL_PAYMENT_WITHOUT_PROVIDER"]
    );
});

test("financial reconciliation uses half-open provider updatedAt window", async () => {
    const report = await service({
        checkouts: [
            checkout({
                id: "bill-lower",
                externalId: "order-lower",
                status: "PENDING",
                paidAmount: null,
                updatedAt: "2026-08-27T00:00:00.000Z"
            }),
            checkout({
                id: "bill-upper",
                externalId: "order-upper",
                status: "PENDING",
                paidAmount: null,
                updatedAt: "2026-08-28T00:00:00.000Z"
            }),
            checkout({
                id: "bill-old",
                externalId: "order-old",
                status: "PENDING",
                paidAmount: null,
                updatedAt: "2026-08-26T23:59:59.999Z"
            })
        ]
    }).run();

    assert.deepEqual(report.divergences, []);
    assert.equal(report.summary.providerCheckoutsRead, 3);
    assert.equal(report.summary.providerCheckoutsInActivityWindow, 1);
    assert.equal(report.summary.providerCheckoutsCompared, 1);
    assert.equal(
        report.audit.providerActivityWindow,
        "updatedAt >= periodFrom AND updatedAt < periodTo"
    );
});

test("financial reconciliation keeps old provider-only financial checkout every day", async () => {
    const report = await service({
        checkouts: [
            checkout({
                id: "bill-old-orphan",
                externalId: "123e4567-e89b-12d3-a456-426614174000",
                updatedAt: "2025-01-01T00:00:00.000Z"
            })
        ]
    }).run();

    assert.equal(report.summary.providerCheckoutsInActivityWindow, 0);
    assert.equal(report.summary.providerCheckoutsCompared, 1);
    assert.deepEqual(
        report.divergences.map((item) => item.type),
        ["PROVIDER_PAYMENT_WITHOUT_ORDER"]
    );
});

test("financial reconciliation keeps old provider counterpart for local window activity", async () => {
    const report = await service({
        payments: [payment()],
        checkouts: [checkout({ updatedAt: "2026-08-26T12:00:00.000Z" })]
    }).run();

    assert.equal(report.summary.providerCheckoutsRead, 1);
    assert.deepEqual(
        report.divergences.map((item) => item.type),
        ["TIME_MISMATCH"]
    );
});

test("financial reconciliation detects incompatible order and payment states", async () => {
    const paidCancelled = await service({
        payments: [payment({ orderStatus: "CANCELLED" })],
        checkouts: [checkout()]
    }).run();
    const refundedPaid = await service({
        payments: [
            payment({
                orderStatus: "PAID",
                status: "REFUNDED",
                refundedAt: paidAt
            })
        ],
        checkouts: [checkout({ status: "REFUNDED" })]
    }).run();

    assert.deepEqual(
        paidCancelled.divergences.map((item) => item.type),
        ["ORDER_PAYMENT_STATUS_MISMATCH"]
    );
    assert.deepEqual(
        refundedPaid.divergences.map((item) => item.type),
        ["ORDER_PAYMENT_STATUS_MISMATCH"]
    );
});

test("financial reconciliation compares refunded provider time with local refundedAt", async () => {
    const matching = await service({
        payments: [
            payment({
                orderStatus: "CANCELLED",
                status: "REFUNDED",
                refundedAt: paidAt
            })
        ],
        checkouts: [checkout({ status: "REFUNDED" })]
    }).run();
    const missingTimestamp = await service({
        payments: [
            payment({
                orderStatus: "CANCELLED",
                status: "REFUNDED",
                refundedAt: null
            })
        ],
        checkouts: [checkout({ status: "REFUNDED" })]
    }).run();

    assert.deepEqual(matching.divergences, []);
    assert.deepEqual(
        missingTimestamp.divergences.map((item) => item.type),
        ["TIME_MISMATCH"]
    );
});

test("financial reconciliation detects duplicate checkout for same externalId", async () => {
    const report = await service({
        payments: [payment()],
        checkouts: [checkout(), checkout({ id: "bill_DUPLICATE" })]
    }).run();

    assert.deepEqual(
        new Set(report.divergences.map((item) => item.type)),
        new Set(["PROVIDER_ID_MISMATCH", "DUPLICATE_PROVIDER_EXTERNAL_ID"])
    );
    assert.ok(report.divergences.every((item) => item.providerCheckoutId === "bill_DUPLICATE"));
});

test("financial reconciliation reports every required divergence class", async () => {
    const report = await service({
        payments: [
            payment({
                orderUuid: "order-mismatch",
                providerCheckoutId: "bill-mismatch",
                expectedAmountInCents: 1500,
                paidAmountInCents: 1500,
                paidAt: new Date("2026-08-27T10:00:00.000Z")
            }),
            payment({
                orderUuid: "order-local-only",
                providerCheckoutId: "bill-local-only"
            }),
            payment({
                orderUuid: "order-time",
                providerCheckoutId: "bill-time",
                paidAt: new Date("2026-08-27T10:00:00.000Z")
            })
        ],
        paidOrders: [{ orderUuid: "order-no-payment", payment: null }],
        checkouts: [
            checkout({ id: "bill-provider-only", externalId: "order-provider-only" }),
            checkout({
                id: "bill-mismatch",
                externalId: "wrong-order",
                amount: 1000,
                paidAmount: 1000,
                status: "REFUNDED",
                updatedAt: "2026-08-27T12:00:00.000Z"
            }),
            checkout({ id: "bill-time", externalId: "order-time" })
        ]
    }).run();

    assert.deepEqual(
        new Set(report.divergences.map((item) => item.type)),
        new Set([
            "PROVIDER_PAYMENT_WITHOUT_ORDER",
            "PAID_ORDER_WITHOUT_PAYMENT",
            "LOCAL_PAYMENT_WITHOUT_PROVIDER",
            "AMOUNT_MISMATCH",
            "EXTERNAL_ID_MISMATCH",
            "STATUS_MISMATCH",
            "TIME_MISMATCH"
        ])
    );
    assert.ok(report.divergences.every((item) => item.owner === "finance-team"));
    assert.ok(report.divergences.every((item) => item.resolutionStatus === "OPEN"));
    assert.ok(
        report.divergences.every((item) => !JSON.stringify(item).includes("example.test/checkout"))
    );
});

test("financial reconciliation applies latest audited resolution by fingerprint", async () => {
    const initial = await service({ checkouts: [checkout()] }).run();
    const fingerprint = initial.divergences[0].fingerprint;
    const report = await service({
        checkouts: [checkout()],
        resolutions: {
            [fingerprint]: [
                {
                    at: "2026-08-28T01:10:00.000Z",
                    owner: "ops-team",
                    status: "INVESTIGATING"
                },
                {
                    at: "2026-08-28T02:00:00.000Z",
                    owner: "finance-team",
                    status: "RESOLVED",
                    resolutionCode: "WEBHOOK_REPROCESSED",
                    auditReference: "INC-2026-0042"
                }
            ]
        }
    }).run();

    assert.equal(report.divergences[0].owner, "finance-team");
    assert.equal(report.divergences[0].resolutionStatus, "RESOLVED");
    assert.equal(report.divergences[0].resolutionCode, "WEBHOOK_REPROCESSED");
    assert.equal(report.divergences[0].auditReference, "INC-2026-0042");
    assert.equal(report.divergences[0].resolutionUpdatedAt, "2026-08-28T02:00:00.000Z");
});

test("financial reconciliation requires owner and valid period", () => {
    const local: FinancialReconciliationLocalSource = {
        listPayments: async () => [],
        listPaidOrders: async () => []
    };
    assert.throws(
        () =>
            new FinancialReconciliationService(
                local,
                { listCheckouts: async () => [] },
                {
                    owner: "personal@example.test",
                    periodFrom: new Date("2026-08-27T00:00:00.000Z"),
                    periodTo: new Date("2026-08-28T00:00:00.000Z")
                }
            ),
        /Responsavel/
    );
});

test("financial reconciliation requires prefixed audit reference", async () => {
    const initial = await service({ checkouts: [checkout()] }).run();
    const fingerprint = initial.divergences[0].fingerprint;

    assert.throws(
        () =>
            service({
                checkouts: [checkout()],
                resolutions: {
                    [fingerprint]: [
                        {
                            at: "2026-08-28T02:00:00.000Z",
                            owner: "finance-ops",
                            status: "INVESTIGATING",
                            auditReference: "customer123"
                        }
                    ]
                }
            }),
        /Evento de resolucao invalido/
    );
});

test("Prisma source sweeps persistent financial invariants without a date filter", async () => {
    const paymentCalls: Array<Record<string, unknown>> = [];
    let orderCall: Record<string, unknown> | undefined;
    const source = new PrismaFinancialReconciliationSource({
        orderPayment: {
            findMany: async (args: Record<string, unknown>) => {
                paymentCalls.push(args);
                return [];
            }
        },
        order: {
            findMany: async (args: Record<string, unknown>) => {
                orderCall = args;
                return [];
            }
        }
    } as never);
    await source.listPayments();
    await source.listPaidOrders();

    assert.deepEqual((paymentCalls[0].where as { status: { in: string[] } }).status.in, [
        "PAID",
        "REFUND_PENDING",
        "REFUNDED",
        "DISPUTED",
        "LOST"
    ]);
    assert.equal("updatedAt" in (paymentCalls[0].where as object), false);
    assert.equal("updatedAt" in (orderCall?.where as object), false);
    assert.deepEqual((orderCall?.where as { status: { in: string[] } }).status.in, [
        "PAID",
        "PROCESSING",
        "SHIPPED",
        "DELIVERED"
    ]);
});

test("Prisma source paginates and fails closed on local record ceiling", async () => {
    const calls: Array<Record<string, unknown>> = [];
    const row = (id: number) => ({
        id,
        providerCheckoutId: `bill-${id}`,
        status: "PAID",
        expectedAmountInCents: 1000,
        paidAmountInCents: 1000,
        paidAt,
        refundedAt: null,
        updatedAt: paidAt,
        order: { uuid: `order-${id}`, status: "PAID" }
    });
    const source = new PrismaFinancialReconciliationSource(
        {
            orderPayment: {
                findMany: async (args: Record<string, unknown>) => {
                    calls.push(args);
                    return calls.length === 1 ? [row(1), row(2)] : [row(3)];
                }
            }
        } as never,
        { pageSize: 2, maxRecords: 3, maxPages: 2 }
    );

    assert.equal((await source.listPayments()).length, 3);
    assert.deepEqual(calls[1].cursor, { id: 2 });
    assert.equal(calls[1].skip, 1);

    const limited = new PrismaFinancialReconciliationSource(
        {
            orderPayment: { findMany: async () => [row(1), row(2)] }
        } as never,
        { pageSize: 2, maxRecords: 1, maxPages: 2 }
    );
    await assert.rejects(limited.listPayments(), /limite local/);
});

test("Prisma source rejects repeated local cursor and page exhaustion", async () => {
    const row = (id: number) => ({
        id,
        providerCheckoutId: `bill-${id}`,
        status: "PAID",
        expectedAmountInCents: 1000,
        paidAmountInCents: 1000,
        paidAt,
        refundedAt: null,
        updatedAt: paidAt,
        order: { uuid: `order-${id}`, status: "PAID" }
    });
    const repeated = new PrismaFinancialReconciliationSource(
        {
            orderPayment: { findMany: async () => [row(1)] }
        } as never,
        { pageSize: 1, maxRecords: 10, maxPages: 2 }
    );
    await assert.rejects(repeated.listPayments(), /repetiu cursor/);

    let nextId = 0;
    const endless = new PrismaFinancialReconciliationSource(
        {
            orderPayment: { findMany: async () => [row(++nextId)] }
        } as never,
        { pageSize: 1, maxRecords: 10, maxPages: 2 }
    );
    await assert.rejects(endless.listPayments(), /limite local de paginas/);
});
