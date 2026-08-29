import { z } from "zod";
import { productionDatabaseUrlIssue } from "../config/env";
import { checkoutAllowedUserUuids } from "../modules/payments/services/checkout-availability";

const MAX_APPROVED_WINDOW_MS = 24 * 60 * 60 * 1000;
const count = z.coerce.number().int().min(0).max(1_000_000_000);
const positiveAmount = z.coerce.number().int().positive().max(1_000_000_000);
const uuid = z.uuid();
const utcDateTime = z.iso
    .datetime()
    .refine((value) => /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d{1,3})?Z$/.test(value));

export type ProductionSmokeInputs = {
    orderUuid: string;
    webhookEventId: string;
    expectedAmountInCents: number;
    approvedFrom: Date;
    approvedTo: Date;
    expectedOtherPayableOrderCheckouts: number;
    expectedOtherPayablePaymentLinks: number;
    allowedUserUuid: string;
    expectedDatabaseName: string;
};

export type ProductionSmokeSnapshot = {
    environment: {
        nodeEnvironment: string | undefined;
        checkoutEnabled: string | undefined;
        rolloutMode: string | undefined;
        allowedUserCount: number;
    };
    order: {
        found: boolean;
        ownerUuid: string | null;
        ownerActive: boolean;
        status: string | null;
        totalInCents: number | null;
        checkoutProvider: string | null;
        checkoutReference: string | null;
        createdAt: Date | null;
    };
    payment: {
        found: boolean;
        provider: string | null;
        status: string | null;
        providerMethod: string | null;
        providerCheckoutId: string | null;
        expectedAmountInCents: number | null;
        paidAmountInCents: number | null;
        paidAt: Date | null;
        providerProofMatches: boolean;
    };
    webhook: {
        found: boolean;
        provider: string | null;
        eventType: string | null;
        processedAt: Date | null;
        error: string | null;
        createdAt: Date | null;
        payloadProofMatches: boolean;
    };
    fulfillment: {
        count: number;
        status: string | null;
        createdAt: Date | null;
        completedAt: Date | null;
    };
    shipment: {
        count: number;
        status: string | null;
        providerOrderIdPresent: boolean;
        purchasedAt: Date | null;
    };
    email: {
        count: number;
        type: string | null;
        status: string | null;
        providerMessageIdPresent: boolean;
        providerRecordMatches: boolean;
        sentAt: Date | null;
        acceptedDeliveryCount: number;
    };
    inventory: {
        otherPayableOrderCheckouts: number;
        otherPayablePaymentLinks: number;
    };
};

export type ProductionSmokeCheck = {
    id: string;
    status: "AUTO_PASS" | "AUTO_FAIL";
    count?: number;
};

export function readProductionSmokeInputs(environment: NodeJS.ProcessEnv): ProductionSmokeInputs {
    if (environment.NODE_ENV !== "production") throw new Error("invalid environment");
    if (environment.CHECKOUT_ENABLED !== "true") throw new Error("checkout disabled");
    if (environment.CHECKOUT_ROLLOUT_MODE !== "ALLOWLIST") throw new Error("invalid rollout");

    const allowedUsers = checkoutAllowedUserUuids(environment);
    if (!allowedUsers || allowedUsers.length !== 1) throw new Error("invalid allowlist");

    const orderUuid = uuid.parse(required(environment, "PRODUCTION_SMOKE_ORDER_UUID"));
    const webhookEventId = z
        .string()
        .trim()
        .min(1)
        .max(200)
        .parse(required(environment, "PRODUCTION_SMOKE_WEBHOOK_EVENT_ID"));
    const expectedAmountInCents = positiveAmount.parse(
        required(environment, "PRODUCTION_SMOKE_EXPECTED_AMOUNT_IN_CENTS")
    );
    const approvedFrom = utcInstant(required(environment, "PRODUCTION_SMOKE_APPROVED_FROM_UTC"));
    const approvedTo = utcInstant(required(environment, "PRODUCTION_SMOKE_APPROVED_TO_UTC"));
    if (
        approvedTo.getTime() <= approvedFrom.getTime() ||
        approvedTo.getTime() - approvedFrom.getTime() > MAX_APPROVED_WINDOW_MS
    ) {
        throw new Error("invalid approved window");
    }

    return {
        orderUuid,
        webhookEventId,
        expectedAmountInCents,
        approvedFrom,
        approvedTo,
        expectedOtherPayableOrderCheckouts: count.parse(
            required(environment, "PRODUCTION_SMOKE_EXPECTED_OTHER_PAYABLE_ORDER_CHECKOUTS")
        ),
        expectedOtherPayablePaymentLinks: count.parse(
            required(environment, "PRODUCTION_SMOKE_EXPECTED_OTHER_PAYABLE_PAYMENT_LINKS")
        ),
        allowedUserUuid: allowedUsers[0],
        expectedDatabaseName: required(environment, "PRODUCTION_SMOKE_EXPECTED_DATABASE_NAME")
    };
}

export function productionSmokeDatabaseUrl(environment: NodeJS.ProcessEnv) {
    const connectionString = required(environment, "DATABASE_URL");
    if (productionDatabaseUrlIssue(connectionString)) {
        throw new Error("invalid production database URL");
    }
    const url = new URL(connectionString);
    const expectedHost = required(
        environment,
        "PRODUCTION_SMOKE_EXPECTED_DATABASE_HOST"
    ).toLowerCase();
    const expectedPort = z.coerce
        .number()
        .int()
        .min(1)
        .max(65535)
        .parse(required(environment, "PRODUCTION_SMOKE_EXPECTED_DATABASE_PORT"));
    const expectedName = required(environment, "PRODUCTION_SMOKE_EXPECTED_DATABASE_NAME");
    const actualName = decodeURIComponent(url.pathname.replace(/^\//, ""));
    if (
        url.hostname.toLowerCase() !== expectedHost ||
        Number(url.port || "5432") !== expectedPort ||
        actualName !== expectedName
    ) {
        throw new Error("unexpected database target");
    }
    return connectionString;
}

export function evaluateProductionSmoke(
    input: ProductionSmokeInputs,
    snapshot: ProductionSmokeSnapshot
) {
    const checks: ProductionSmokeCheck[] = [];
    const check = (id: string, passes: boolean, actualCount?: number) =>
        checks.push({
            id,
            status: passes ? "AUTO_PASS" : "AUTO_FAIL",
            ...(actualCount === undefined ? {} : { count: actualCount })
        });
    const inWindow = (value: Date | null) =>
        value !== null &&
        value.getTime() >= input.approvedFrom.getTime() &&
        value.getTime() < input.approvedTo.getTime();

    check("production_environment", snapshot.environment.nodeEnvironment === "production");
    check("checkout_master_enabled", snapshot.environment.checkoutEnabled === "true");
    check("checkout_rollout_allowlist", snapshot.environment.rolloutMode === "ALLOWLIST");
    check(
        "single_internal_user_allowlisted",
        snapshot.environment.allowedUserCount === 1 &&
            snapshot.order.ownerUuid === input.allowedUserUuid
    );
    check("internal_user_active", snapshot.order.found && snapshot.order.ownerActive);
    check("order_found", snapshot.order.found);
    check("order_processing", snapshot.order.status === "PROCESSING");
    check(
        "order_amount_matches_approval",
        snapshot.order.totalInCents === input.expectedAmountInCents
    );
    check("order_created_in_approved_window", inWindow(snapshot.order.createdAt));
    check("payment_found", snapshot.payment.found);
    check(
        "payment_paid_by_pix",
        snapshot.payment.status === "PAID" && snapshot.payment.providerMethod === "PIX"
    );
    check(
        "payment_amounts_match",
        snapshot.payment.expectedAmountInCents === input.expectedAmountInCents &&
            snapshot.payment.paidAmountInCents === input.expectedAmountInCents &&
            snapshot.order.totalInCents === input.expectedAmountInCents
    );
    check(
        "payment_provider_link_matches_order",
        snapshot.payment.provider === "ABACATEPAY" &&
            snapshot.order.checkoutProvider === "ABACATEPAY" &&
            snapshot.payment.providerCheckoutId !== null &&
            snapshot.order.checkoutReference === snapshot.payment.providerCheckoutId
    );
    check("payment_provider_record_matches", snapshot.payment.providerProofMatches);
    check("payment_paid_in_approved_window", inWindow(snapshot.payment.paidAt));
    check("webhook_found", snapshot.webhook.found);
    check(
        "webhook_completed_and_processed",
        snapshot.webhook.provider === "ABACATEPAY" &&
            snapshot.webhook.eventType === "checkout.completed" &&
            snapshot.webhook.processedAt !== null &&
            snapshot.webhook.error === null
    );
    check("webhook_record_matches", snapshot.webhook.payloadProofMatches);
    check(
        "webhook_in_approved_window",
        inWindow(snapshot.webhook.createdAt) && inWindow(snapshot.webhook.processedAt)
    );
    check("single_fulfillment", snapshot.fulfillment.count === 1, snapshot.fulfillment.count);
    check("fulfillment_completed", snapshot.fulfillment.status === "COMPLETED");
    check(
        "fulfillment_in_approved_window",
        inWindow(snapshot.fulfillment.createdAt) && inWindow(snapshot.fulfillment.completedAt)
    );
    check("single_shipment", snapshot.shipment.count === 1, snapshot.shipment.count);
    check(
        "shipping_label_purchased",
        snapshot.shipment.status === "LABEL_PURCHASED" && snapshot.shipment.providerOrderIdPresent
    );
    check("shipment_purchased_in_approved_window", inWindow(snapshot.shipment.purchasedAt));
    check("single_payment_email", snapshot.email.count === 1, snapshot.email.count);
    check(
        "payment_email_sent",
        snapshot.email.type === "PAYMENT_CONFIRMED" &&
            snapshot.email.status === "SENT" &&
            snapshot.email.providerMessageIdPresent &&
            snapshot.email.providerRecordMatches
    );
    check(
        "single_accepted_email_delivery",
        snapshot.email.acceptedDeliveryCount === 1,
        snapshot.email.acceptedDeliveryCount
    );
    check("payment_email_sent_in_approved_window", inWindow(snapshot.email.sentAt));
    check(
        "other_payable_order_inventory_matches_approval",
        snapshot.inventory.otherPayableOrderCheckouts === input.expectedOtherPayableOrderCheckouts,
        snapshot.inventory.otherPayableOrderCheckouts
    );
    check(
        "other_payable_link_inventory_matches_approval",
        snapshot.inventory.otherPayablePaymentLinks === input.expectedOtherPayablePaymentLinks,
        snapshot.inventory.otherPayablePaymentLinks
    );

    return {
        overallStatus: checks.some((item) => item.status === "AUTO_FAIL")
            ? ("AUTO_FAIL" as const)
            : ("MANUAL_REQUIRED" as const),
        automaticChecks: checks,
        manualChecks: manualProductionSmokeChecks()
    };
}

export function manualProductionSmokeChecks() {
    return [
        "financial_and_operational_approval_recorded",
        "lowest_appropriate_product_and_controlled_address_confirmed",
        "real_pix_payment_confirmed",
        "provider_webhook_delivery_confirmed",
        "order_paid_transition_observed",
        "email_received_and_links_checked",
        "abacatepay_and_superfrete_dashboards_checked",
        "test_order_and_label_disposition_completed",
        "financial_reconciliation_completed",
        "evidence_recorded_in_restricted_system"
    ].map((id) => ({ id, status: "MANUAL_REQUIRED" as const }));
}

function required(environment: NodeJS.ProcessEnv, name: string) {
    const value = environment[name]?.trim();
    if (!value) throw new Error(`missing ${name}`);
    return value;
}

function utcInstant(value: string) {
    return new Date(utcDateTime.parse(value));
}
