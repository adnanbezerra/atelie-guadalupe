import * as assert from "node:assert";
import { test } from "node:test";
import { evaluateCanaryRelease } from "../../src/scripts/canary-release-safety";

function input() {
    return {
        policy: {
            stage: "INTERNAL",
            minimumDurationMinutes: 60,
            minimumCompletedOrders: 3
        },
        evidence: {
            durationMinutes: 60,
            completedOrders: 3,
            openAlerts: 0,
            droppedObservations: 0,
            financialDivergences: 0,
            logisticsDivergences: 0,
            unresolvedSupportIncidents: 0,
            failedEmails: 0,
            stalePaidOrders: 0,
            staleWebhooks: 0,
            duplicateCharges: 0,
            amountMismatches: 0,
            lostPayments: 0,
            duplicateLabels: 0,
            reconciliationStatus: "PASS",
            killSwitchVerified: true,
            evidenceRecorded: true,
            technicalApproval: true,
            operationalApproval: true
        }
    };
}

test("canary evaluator advances only when explicit policy and all evidence pass", () => {
    assert.deepEqual(evaluateCanaryRelease(input()).reasonIds, []);
    assert.equal(evaluateCanaryRelease(input()).decision, "ADVANCE");
});

test("canary evaluator holds while window, volume, alerts or approvals remain open", () => {
    const candidate = input();
    candidate.evidence.durationMinutes = 59;
    candidate.evidence.openAlerts = 1;
    candidate.evidence.operationalApproval = false;
    const report = evaluateCanaryRelease(candidate);
    assert.equal(report.decision, "HOLD");
    assert.deepEqual(report.reasonIds, [
        "MINIMUM_DURATION",
        "OPEN_ALERTS",
        "OPERATIONAL_APPROVAL_MISSING"
    ]);
});

test("canary evaluator prioritizes rollback for financial, webhook and logistics risk", () => {
    const candidate = input();
    candidate.evidence.duplicateCharges = 1;
    candidate.evidence.staleWebhooks = 1;
    candidate.evidence.duplicateLabels = 1;
    candidate.evidence.reconciliationStatus = "UNAVAILABLE";
    candidate.evidence.technicalApproval = false;
    const report = evaluateCanaryRelease(candidate);
    assert.equal(report.decision, "ROLLBACK");
    assert.deepEqual(report.reasonIds, [
        "DUPLICATE_CHARGE",
        "WEBHOOK_UNAVAILABLE",
        "DUPLICATE_LABEL",
        "RECONCILIATION_UNAVAILABLE"
    ]);
});

test("canary evaluator rejects unknown fields and non-positive thresholds", () => {
    assert.throws(() =>
        evaluateCanaryRelease({
            ...input(),
            policy: { ...input().policy, minimumDurationMinutes: -1 },
            secret: "must-not-be-accepted"
        })
    );
    assert.throws(() =>
        evaluateCanaryRelease({
            ...input(),
            policy: { ...input().policy, minimumCompletedOrders: 0 }
        })
    );
});

test("canary evaluator accepts only closed non-identifying stage names", () => {
    for (const stage of [
        "customer@example.com",
        "0195f4aa-7f18-7db5-9f32-06f4a9a2b401",
        "123",
        "INTERNAL_TEAM_A"
    ]) {
        assert.throws(() =>
            evaluateCanaryRelease({
                ...input(),
                policy: { ...input().policy, stage }
            })
        );
    }
    for (const stage of ["INTERNAL", "SMALL_GROUP", "PUBLIC"]) {
        assert.doesNotThrow(() =>
            evaluateCanaryRelease({
                ...input(),
                policy: { ...input().policy, stage }
            })
        );
    }
});
