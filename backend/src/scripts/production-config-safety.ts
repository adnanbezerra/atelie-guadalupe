import { ABACATEPAY_V2_URL, SUPERFRETE_PRODUCTION_URL, validateEnv } from "../config/env";

export type ProductionPreflightStatus = "AUTO_PASS" | "AUTO_FAIL" | "MANUAL_REQUIRED";

export type ProductionPreflightCheck = {
    id: string;
    status: ProductionPreflightStatus;
};

export type ProductionDatabasePrivileges = {
    dangerousRoleAttributes: boolean;
    ownsCurrentDatabase: boolean;
    ownsPublicSchema: boolean;
    ownsApplicationTables: boolean;
    canCreateInCurrentDatabase: boolean;
    canCreateInPublicSchema: boolean;
    canUsePublicSchema: boolean;
};

const MANUAL_CHECK_IDS = [
    "database_target_and_runtime_grants_reviewed",
    "jwt_secret_unique_to_production",
    "cors_origins_match_expected_frontends",
    "abacatepay_key_confirmed_in_production_dashboard",
    "abacatepay_webhook_endpoint_secret_and_events_confirmed",
    "superfrete_token_and_user_agent_confirmed_in_production",
    "worker_replica_count_matches_planned_concurrency",
    "resend_sender_reply_to_and_domain_confirmed",
    "production_log_sample_contains_no_secrets_or_personal_data",
    "two_person_review_recorded"
] as const;

function automatic(id: string, passes: boolean): ProductionPreflightCheck {
    return { id, status: passes ? "AUTO_PASS" : "AUTO_FAIL" };
}

export function inspectProductionEnvironment(environment: NodeJS.ProcessEnv) {
    let environmentValid = true;
    try {
        validateEnv(environment);
    } catch {
        environmentValid = false;
    }

    return [
        automatic("node_environment_is_production", environment.NODE_ENV === "production"),
        automatic("production_environment_schema", environmentValid),
        automatic("checkout_disabled_during_preflight", environment.CHECKOUT_ENABLED === "false"),
        automatic(
            "checkout_rollout_starts_with_allowlist",
            environment.CHECKOUT_ROLLOUT_MODE === "ALLOWLIST" &&
                Boolean(environment.CHECKOUT_ALLOWED_USER_UUIDS?.trim())
        ),
        automatic(
            "abacatepay_production_mode",
            environment.ABACATEPAY_BASE_URL === ABACATEPAY_V2_URL &&
                environment.ABACATEPAY_EXPECTED_DEV_MODE === "false"
        ),
        automatic(
            "superfrete_production_mode",
            environment.SUPERFRETE_BASE_URL === SUPERFRETE_PRODUCTION_URL &&
                environment.SUPERFRETE_EXPECTED_ENVIRONMENT === "production"
        ),
        automatic(
            "worker_flags_configured_explicitly",
            ["true", "false"].includes(environment.FULFILLMENT_WORKER_ENABLED ?? "") &&
                ["true", "false"].includes(environment.EMAIL_WORKER_ENABLED ?? "") &&
                ["true", "false"].includes(environment.SHIPPING_TRACKING_WORKER_ENABLED ?? "")
        )
    ];
}

export function inspectProductionDatabasePrivileges(
    privileges: ProductionDatabasePrivileges
): ProductionPreflightCheck[] {
    return [
        automatic("database_role_has_no_dangerous_attributes", !privileges.dangerousRoleAttributes),
        automatic("database_role_does_not_own_database", !privileges.ownsCurrentDatabase),
        automatic("database_role_does_not_own_public_schema", !privileges.ownsPublicSchema),
        automatic(
            "database_role_does_not_own_application_tables",
            !privileges.ownsApplicationTables
        ),
        automatic(
            "database_role_cannot_create_in_database",
            !privileges.canCreateInCurrentDatabase
        ),
        automatic(
            "database_role_cannot_create_in_public_schema",
            !privileges.canCreateInPublicSchema
        ),
        automatic("database_role_can_use_public_schema", privileges.canUsePublicSchema)
    ];
}

export function manualProductionChecks(): ProductionPreflightCheck[] {
    return MANUAL_CHECK_IDS.map((id) => ({ id, status: "MANUAL_REQUIRED" }));
}

export function productionPreflightReport(
    automaticChecks: ProductionPreflightCheck[],
    manualChecks = manualProductionChecks()
) {
    const autoFailed = automaticChecks.some((check) => check.status === "AUTO_FAIL");
    return {
        overallStatus: autoFailed ? "AUTO_FAIL" : "MANUAL_REQUIRED",
        automaticChecks,
        manualChecks
    } as const;
}
