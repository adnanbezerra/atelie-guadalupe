import { AppError } from "../../../core/errors/app-error";
import { z } from "zod";

const MAX_ALLOWED_USERS = 100;

export type CheckoutCreationContext =
    | { flow: "ORDER"; userUuid: string }
    | { flow: "PAYMENT_LINK" };

export function checkoutAllowedUserUuids(environment: NodeJS.ProcessEnv = process.env) {
    const raw = environment.CHECKOUT_ALLOWED_USER_UUIDS?.trim();
    if (!raw) return [];
    const values = raw.split(",").map((value) => value.trim().toLowerCase());
    if (
        values.length > MAX_ALLOWED_USERS ||
        values.some((value) => !z.uuid().safeParse(value).success) ||
        new Set(values).size !== values.length
    ) {
        return null;
    }
    return values;
}

export function isCheckoutCreationEnabled(
    context: CheckoutCreationContext,
    environment: NodeJS.ProcessEnv = process.env
) {
    if (environment.CHECKOUT_ENABLED === "false") return false;
    if (environment.CHECKOUT_ENABLED !== "true" && environment.NODE_ENV === "production") {
        return false;
    }

    const mode =
        environment.CHECKOUT_ROLLOUT_MODE ??
        (environment.NODE_ENV === "production" ? undefined : "PUBLIC");
    const allowedUsers = checkoutAllowedUserUuids(environment);
    if (mode === "PUBLIC") return allowedUsers?.length === 0;
    if (mode !== "ALLOWLIST" || !allowedUsers || context.flow === "PAYMENT_LINK") return false;
    return allowedUsers.includes(context.userUuid.toLowerCase());
}

export function checkoutUnavailableError() {
    return AppError.serviceUnavailable(
        "Novos pagamentos estao temporariamente indisponiveis. Tente novamente mais tarde"
    );
}
