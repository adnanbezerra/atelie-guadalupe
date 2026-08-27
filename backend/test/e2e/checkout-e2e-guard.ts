const SUPERFRETE_SANDBOX_URL = "https://sandbox.superfrete.com/api/v0";

type CheckoutE2eEnvironment = Record<string, string | undefined>;

const REQUIRED_ENVIRONMENT = [
    "DATABASE_URL",
    "SEED_ADMIN_EMAIL",
    "SEED_ADMIN_PASSWORD",
    "SEED_ADMIN_DOCUMENT",
    "ABACATEPAY_API_KEY",
    "ABACATEPAY_WEBHOOK_SECRET",
    "SUPERFRETE_TOKEN",
    "SUPERFRETE_USER_AGENT"
];

export function assertCheckoutE2eSafety(environment: CheckoutE2eEnvironment) {
    const missing = REQUIRED_ENVIRONMENT.filter((name) => !environment[name]);
    if (missing.length > 0) {
        throw new Error(`E2E recusado: variaveis obrigatorias ausentes: ${missing.join(", ")}`);
    }
    if (environment.NODE_ENV === "production") {
        throw new Error("E2E recusado: NODE_ENV de producao");
    }
    if (environment.CHECKOUT_E2E_ALLOW_DATABASE_WRITES !== "true") {
        throw new Error(
            "E2E recusado: confirme banco nao-producao com CHECKOUT_E2E_ALLOW_DATABASE_WRITES=true"
        );
    }
    if (!environment.ABACATEPAY_API_KEY?.startsWith("abc_dev_")) {
        throw new Error("E2E recusado: chave AbacatePay de desenvolvimento obrigatoria");
    }
    const superFreteBaseUrl = (
        environment.SUPERFRETE_BASE_URL ?? SUPERFRETE_SANDBOX_URL
    ).replace(/\/$/, "");
    if (superFreteBaseUrl !== SUPERFRETE_SANDBOX_URL) {
        throw new Error("E2E recusado: URL Superfrete deve apontar ao sandbox");
    }
    return { superFreteBaseUrl };
}

export function checkoutE2eSkipReason(enabled: boolean) {
    return enabled ? false : "Defina RUN_CHECKOUT_E2E=true para executar integracoes sandbox";
}

export function checkoutE2eQuotePayload(destinationZipCode: string, productUuid: string) {
    return {
        zipCode: destinationZipCode,
        items: [{ productUuid, productSize: "GRAMS_70" as const, quantity: 1 }]
    };
}
