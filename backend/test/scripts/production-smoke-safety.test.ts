import * as assert from "node:assert";
import { test } from "node:test";
import {
    evaluateProductionSmoke,
    ProductionSmokeInputs,
    ProductionSmokeSnapshot,
    productionSmokeDatabaseUrl,
    readProductionSmokeInputs
} from "../../src/scripts/production-smoke-safety";

const userUuid = "0195f4aa-7f18-7db5-9f32-06f4a9a2b401";
const orderUuid = "0195f4aa-7f18-7db5-9f32-06f4a9a2b402";
const eventId = "event-provider-private-value";

function environment(): NodeJS.ProcessEnv {
    return {
        NODE_ENV: "production",
        CHECKOUT_ENABLED: "true",
        CHECKOUT_ROLLOUT_MODE: "ALLOWLIST",
        CHECKOUT_ALLOWED_USER_UUIDS: userUuid,
        PRODUCTION_SMOKE_ORDER_UUID: orderUuid,
        PRODUCTION_SMOKE_WEBHOOK_EVENT_ID: eventId,
        PRODUCTION_SMOKE_EXPECTED_AMOUNT_IN_CENTS: "987654321",
        PRODUCTION_SMOKE_APPROVED_FROM_UTC: "2026-08-29T01:00:00.000Z",
        PRODUCTION_SMOKE_APPROVED_TO_UTC: "2026-08-29T02:00:00.000Z",
        PRODUCTION_SMOKE_EXPECTED_OTHER_PAYABLE_ORDER_CHECKOUTS: "2",
        PRODUCTION_SMOKE_EXPECTED_OTHER_PAYABLE_PAYMENT_LINKS: "3",
        DATABASE_URL:
            "postgresql://runtime:private@db.internal:5432/checkout_production?sslmode=require",
        PRODUCTION_SMOKE_EXPECTED_DATABASE_HOST: "db.internal",
        PRODUCTION_SMOKE_EXPECTED_DATABASE_PORT: "5432",
        PRODUCTION_SMOKE_EXPECTED_DATABASE_NAME: "checkout_production"
    };
}

function input(): ProductionSmokeInputs {
    return readProductionSmokeInputs(environment());
}

function snapshot(): ProductionSmokeSnapshot {
    const instant = new Date("2026-08-29T01:30:00.000Z");
    return {
        environment: {
            nodeEnvironment: "production",
            checkoutEnabled: "true",
            rolloutMode: "ALLOWLIST",
            allowedUserCount: 1
        },
        order: {
            found: true,
            ownerUuid: userUuid,
            ownerActive: true,
            status: "PROCESSING",
            totalInCents: 987654321,
            checkoutProvider: "ABACATEPAY",
            checkoutReference: "provider-checkout-private-value",
            createdAt: instant
        },
        payment: {
            found: true,
            provider: "ABACATEPAY",
            status: "PAID",
            providerMethod: "PIX",
            providerCheckoutId: "provider-checkout-private-value",
            expectedAmountInCents: 987654321,
            paidAmountInCents: 987654321,
            paidAt: instant,
            providerProofMatches: true
        },
        webhook: {
            found: true,
            provider: "ABACATEPAY",
            eventType: "checkout.completed",
            processedAt: instant,
            error: null,
            createdAt: instant,
            payloadProofMatches: true
        },
        fulfillment: {
            count: 1,
            status: "COMPLETED",
            createdAt: instant,
            completedAt: instant
        },
        shipment: {
            count: 1,
            status: "LABEL_PURCHASED",
            providerOrderIdPresent: true,
            purchasedAt: instant
        },
        email: {
            count: 1,
            type: "PAYMENT_CONFIRMED",
            status: "SENT",
            providerMessageIdPresent: true,
            providerRecordMatches: true,
            sentAt: instant,
            acceptedDeliveryCount: 1
        },
        inventory: {
            otherPayableOrderCheckouts: 2,
            otherPayablePaymentLinks: 3
        }
    };
}

test("production smoke inputs require production, enabled single-user allowlist and approval", () => {
    const parsed = readProductionSmokeInputs(environment());
    assert.equal(parsed.allowedUserUuid, userUuid);
    assert.equal(parsed.expectedAmountInCents, 987654321);
    assert.equal(parsed.expectedOtherPayableOrderCheckouts, 2);

    for (const invalid of [
        { CHECKOUT_ENABLED: "false" },
        { CHECKOUT_ROLLOUT_MODE: "PUBLIC" },
        { CHECKOUT_ALLOWED_USER_UUIDS: `${userUuid},${orderUuid}` },
        { NODE_ENV: "test" },
        { PRODUCTION_SMOKE_EXPECTED_AMOUNT_IN_CENTS: "0" },
        { PRODUCTION_SMOKE_APPROVED_FROM_UTC: "2026-02-30T01:00:00.000Z" },
        { PRODUCTION_SMOKE_APPROVED_FROM_UTC: "2025-02-29T01:00:00.000Z" },
        { PRODUCTION_SMOKE_APPROVED_FROM_UTC: "2026-04-31T01:00:00.000Z" },
        { PRODUCTION_SMOKE_APPROVED_TO_UTC: "2026-08-30T02:00:00.001Z" }
    ]) {
        assert.throws(() => readProductionSmokeInputs({ ...environment(), ...invalid }));
    }

    const leapYear = readProductionSmokeInputs({
        ...environment(),
        PRODUCTION_SMOKE_APPROVED_FROM_UTC: "2024-02-29T01:00:00.1Z",
        PRODUCTION_SMOKE_APPROVED_TO_UTC: "2024-02-29T02:00:00.123Z"
    });
    assert.equal(leapYear.approvedFrom.toISOString(), "2024-02-29T01:00:00.100Z");
});

test("production smoke database target must match approved host, port and name", () => {
    assert.equal(productionSmokeDatabaseUrl(environment()), environment().DATABASE_URL);
    for (const invalid of [
        { PRODUCTION_SMOKE_EXPECTED_DATABASE_HOST: "other.internal" },
        { PRODUCTION_SMOKE_EXPECTED_DATABASE_PORT: "5433" },
        { PRODUCTION_SMOKE_EXPECTED_DATABASE_NAME: "other_production" },
        { DATABASE_URL: "postgresql://runtime:private@db.internal/checkout_production" },
        {
            DATABASE_URL:
                "postgresql://runtime:private@db.internal/checkout_production?sslmode=disable"
        },
        {
            DATABASE_URL:
                "postgresql://runtime:private@db.internal/checkout_production?sslmode=require&sslmode=verify-full"
        },
        {
            DATABASE_URL:
                "postgresql://runtime:private@db.internal/checkout_production?sslmode=verify-full&sslmode=require"
        },
        {
            DATABASE_URL: "mysql://runtime:private@db.internal/checkout_production?sslmode=require"
        }
    ]) {
        assert.throws(() => productionSmokeDatabaseUrl({ ...environment(), ...invalid }));
    }
});

test("production smoke evaluator verifies all local invariants but remains manual required", () => {
    const report = evaluateProductionSmoke(input(), snapshot());
    assert.equal(report.overallStatus, "MANUAL_REQUIRED");
    assert.ok(report.automaticChecks.every((check) => check.status === "AUTO_PASS"));
    assert.ok(report.manualChecks.every((check) => check.status === "MANUAL_REQUIRED"));
});

test("production smoke approved window includes from and excludes to", () => {
    const approved = input();
    const atFrom = snapshot();
    atFrom.order.createdAt = approved.approvedFrom;
    assert.equal(
        evaluateProductionSmoke(approved, atFrom).automaticChecks.find(
            (check) => check.id === "order_created_in_approved_window"
        )?.status,
        "AUTO_PASS"
    );

    const atTo = snapshot();
    atTo.order.createdAt = approved.approvedTo;
    assert.equal(
        evaluateProductionSmoke(approved, atTo).automaticChecks.find(
            (check) => check.id === "order_created_in_approved_window"
        )?.status,
        "AUTO_FAIL"
    );
});

test("production smoke evaluator fails financial, webhook, fulfillment and inventory drift", () => {
    const candidate = snapshot();
    candidate.payment.paidAmountInCents = 99;
    candidate.webhook.payloadProofMatches = false;
    candidate.webhook.provider = "OTHER";
    candidate.fulfillment.count = 2;
    candidate.shipment.status = "CHECKOUT_REQUESTED";
    candidate.email.acceptedDeliveryCount = 0;
    candidate.email.type = "WELCOME";
    candidate.inventory.otherPayablePaymentLinks = 4;

    const report = evaluateProductionSmoke(input(), candidate);
    assert.equal(report.overallStatus, "AUTO_FAIL");
    assert.deepEqual(
        report.automaticChecks
            .filter((check) => check.status === "AUTO_FAIL")
            .map((check) => check.id),
        [
            "payment_amounts_match",
            "webhook_completed_and_processed",
            "webhook_record_matches",
            "single_fulfillment",
            "shipping_label_purchased",
            "payment_email_sent",
            "single_accepted_email_delivery",
            "other_payable_link_inventory_matches_approval"
        ]
    );
});

test("production smoke report never contains identifiers, amount, dates or provider payload", () => {
    const report = JSON.stringify(evaluateProductionSmoke(input(), snapshot()));
    for (const forbidden of [
        userUuid,
        orderUuid,
        eventId,
        "provider-checkout-private-value",
        "2026-08-29",
        "987654321",
        "checkout_production",
        "payload"
    ]) {
        assert.equal(report.includes(forbidden), false, `report exposed ${forbidden}`);
    }
});
