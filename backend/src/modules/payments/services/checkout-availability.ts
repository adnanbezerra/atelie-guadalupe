import { AppError } from "../../../core/errors/app-error";

export function isCheckoutCreationEnabled(environment: NodeJS.ProcessEnv = process.env) {
    if (environment.CHECKOUT_ENABLED === "true") return true;
    if (environment.CHECKOUT_ENABLED === "false") return false;
    return environment.NODE_ENV !== "production";
}

export function checkoutUnavailableError() {
    return AppError.serviceUnavailable(
        "Novos pagamentos estao temporariamente indisponiveis. Tente novamente mais tarde"
    );
}
