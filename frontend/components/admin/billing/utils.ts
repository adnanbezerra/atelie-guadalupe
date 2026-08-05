import type { PaymentLink, PaymentLinkStatus } from "@/lib/types";

export const RECENT_LINKS_LIMIT = 8;

export const statusDetails: Record<
    PaymentLinkStatus,
    { label: string; detail: string; tone: string }
> = {
    ACTIVE: {
        label: "Não pago",
        detail: "Link ativo",
        tone: "bg-amber-50 text-amber-800 ring-amber-200",
    },
    CREATING: {
        label: "Não pago",
        detail: "Criando checkout",
        tone: "bg-blue-50 text-blue-800 ring-blue-200",
    },
    PENDING: {
        label: "Não pago",
        detail: "Aguardando pagamento",
        tone: "bg-blue-50 text-blue-800 ring-blue-200",
    },
    PAID: {
        label: "Pago",
        detail: "Pagamento confirmado",
        tone: "bg-emerald-50 text-emerald-800 ring-emerald-200",
    },
    EXPIRED: {
        label: "Não pago",
        detail: "Link expirado",
        tone: "bg-slate-100 text-slate-700 ring-slate-200",
    },
    REFUNDED: {
        label: "Reembolsado",
        detail: "Valor devolvido",
        tone: "bg-slate-100 text-slate-700 ring-slate-200",
    },
    DISPUTED: {
        label: "Em disputa",
        detail: "Requer atenção",
        tone: "bg-red-50 text-red-800 ring-red-200",
    },
    LOST: {
        label: "Disputa perdida",
        detail: "Cobrança encerrada",
        tone: "bg-red-50 text-red-800 ring-red-200",
    },
};

export function parseAmountInCents(value: string) {
    const amount = Number(value.replace(",", "."));
    return Number.isFinite(amount) ? Math.round(amount * 100) : 0;
}

export function formatDateTime(value: string) {
    return new Intl.DateTimeFormat("pt-BR", {
        day: "2-digit",
        month: "short",
        year: "numeric",
        hour: "2-digit",
        minute: "2-digit",
    }).format(new Date(value));
}

export function getPublicPaymentUrl(paymentLink: PaymentLink) {
    if (paymentLink.paymentUrl) return paymentLink.paymentUrl;
    return `${window.location.origin}/checkout/manual/${paymentLink.uuid}`;
}

export async function copyText(value: string) {
    try {
        await navigator.clipboard.writeText(value);
    } catch {
        const textarea = document.createElement("textarea");
        textarea.value = value;
        textarea.style.position = "fixed";
        textarea.style.opacity = "0";
        document.body.appendChild(textarea);
        textarea.select();
        const copied = document.execCommand("copy");
        textarea.remove();

        if (!copied) throw new Error("Não foi possível copiar o link.");
    }
}
