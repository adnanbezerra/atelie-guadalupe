import { z } from "zod";

const count = z.number().int().min(0).max(1_000_000_000);
const threshold = z.number().int().positive().max(1_000_000_000);

export const canaryDecisionInputSchema = z
    .object({
        policy: z
            .object({
                stage: z.enum(["INTERNAL", "SMALL_GROUP", "PUBLIC"]),
                minimumDurationMinutes: threshold,
                minimumCompletedOrders: threshold
            })
            .strict(),
        evidence: z
            .object({
                durationMinutes: count,
                completedOrders: count,
                openAlerts: count,
                droppedObservations: count,
                financialDivergences: count,
                logisticsDivergences: count,
                unresolvedSupportIncidents: count,
                failedEmails: count,
                stalePaidOrders: count,
                staleWebhooks: count,
                duplicateCharges: count,
                amountMismatches: count,
                lostPayments: count,
                duplicateLabels: count,
                reconciliationStatus: z.enum(["PASS", "FAIL", "UNAVAILABLE"]),
                killSwitchVerified: z.boolean(),
                evidenceRecorded: z.boolean(),
                technicalApproval: z.boolean(),
                operationalApproval: z.boolean()
            })
            .strict()
    })
    .strict();

export type CanaryDecisionInput = z.infer<typeof canaryDecisionInputSchema>;
export type CanaryDecision = "ADVANCE" | "HOLD" | "ROLLBACK";

export function evaluateCanaryRelease(rawInput: unknown) {
    const input = canaryDecisionInputSchema.parse(rawInput);
    const { evidence, policy } = input;
    const rollbackReasons: string[] = [];
    const holdReasons: string[] = [];

    addIf(rollbackReasons, evidence.duplicateCharges > 0, "DUPLICATE_CHARGE");
    addIf(rollbackReasons, evidence.amountMismatches > 0, "PAYMENT_AMOUNT_MISMATCH");
    addIf(rollbackReasons, evidence.lostPayments > 0, "PAYMENT_LOSS");
    addIf(rollbackReasons, evidence.staleWebhooks > 0, "WEBHOOK_UNAVAILABLE");
    addIf(rollbackReasons, evidence.duplicateLabels > 0, "DUPLICATE_LABEL");
    addIf(rollbackReasons, evidence.financialDivergences > 0, "FINANCIAL_DIVERGENCE");
    addIf(rollbackReasons, evidence.logisticsDivergences > 0, "LOGISTICS_DIVERGENCE");
    addIf(
        rollbackReasons,
        evidence.reconciliationStatus !== "PASS",
        evidence.reconciliationStatus === "FAIL"
            ? "RECONCILIATION_FAILED"
            : "RECONCILIATION_UNAVAILABLE"
    );

    addIf(
        holdReasons,
        evidence.durationMinutes < policy.minimumDurationMinutes,
        "MINIMUM_DURATION"
    );
    addIf(
        holdReasons,
        evidence.completedOrders < policy.minimumCompletedOrders,
        "MINIMUM_COMPLETED_ORDERS"
    );
    addIf(holdReasons, evidence.openAlerts > 0, "OPEN_ALERTS");
    addIf(holdReasons, evidence.droppedObservations > 0, "DROPPED_OBSERVATIONS");
    addIf(holdReasons, evidence.unresolvedSupportIncidents > 0, "SUPPORT_INCIDENTS");
    addIf(holdReasons, evidence.failedEmails > 0, "FAILED_EMAILS");
    addIf(holdReasons, evidence.stalePaidOrders > 0, "STALE_PAID_ORDERS");
    addIf(holdReasons, !evidence.killSwitchVerified, "KILL_SWITCH_NOT_VERIFIED");
    addIf(holdReasons, !evidence.evidenceRecorded, "EVIDENCE_NOT_RECORDED");
    addIf(holdReasons, !evidence.technicalApproval, "TECHNICAL_APPROVAL_MISSING");
    addIf(holdReasons, !evidence.operationalApproval, "OPERATIONAL_APPROVAL_MISSING");

    const decision: CanaryDecision =
        rollbackReasons.length > 0 ? "ROLLBACK" : holdReasons.length > 0 ? "HOLD" : "ADVANCE";
    return {
        schemaVersion: 1,
        decision,
        reasonIds: decision === "ROLLBACK" ? rollbackReasons : holdReasons,
        policy,
        evidenceSummary: evidence
    } as const;
}

function addIf(reasons: string[], condition: boolean, reason: string) {
    if (condition) reasons.push(reason);
}
