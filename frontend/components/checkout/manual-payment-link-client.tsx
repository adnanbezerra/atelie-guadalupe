"use client";

import { useState } from "react";
import { FeedbackDialog } from "@/components/shared/feedback-dialog";
import { ApiError, openPaymentLink } from "@/lib/api";
import type { PaymentLinkPreview, PaymentLinkStatus } from "@/lib/types";
import { formatCurrency } from "@/lib/utils";
import { buildWhatsappLink } from "@/lib/whatsapp";

const supportLink = buildWhatsappLink(
    "Olá! Preciso de ajuda com um link de pagamento personalizado do Ateliê Guadalupe.",
);

const statusContent: Record<
    PaymentLinkStatus,
    { label: string; description: string }
> = {
    ACTIVE: {
        label: "Disponível para pagamento",
        description: "Revise os dados abaixo antes de continuar.",
    },
    PENDING: {
        label: "Pagamento iniciado",
        description: "Você pode reabrir o ambiente seguro para concluir.",
    },
    CREATING: {
        label: "Pagamento sendo preparado",
        description: "Aguarde alguns segundos e atualize esta página.",
    },
    PAID: {
        label: "Cobrança paga",
        description: "Esta cobrança já foi confirmada.",
    },
    EXPIRED: {
        label: "Cobrança expirada",
        description: "Peça um novo link ao atendimento.",
    },
    REFUNDED: {
        label: "Pagamento reembolsado",
        description: "O valor desta cobrança foi devolvido.",
    },
    DISPUTED: {
        label: "Pagamento em análise",
        description: "Fale com o atendimento para acompanhar o caso.",
    },
    LOST: {
        label: "Pagamento não confirmado",
        description: "Fale com o atendimento antes de tentar novamente.",
    },
};

function formatExpiry(value: string | null) {
    if (!value) return "Sem prazo definido";
    return new Intl.DateTimeFormat("pt-BR", {
        dateStyle: "long",
        timeStyle: "short",
    }).format(new Date(value));
}

export function ManualPaymentLinkClient({
    initialError,
    preview,
    uuid,
}: {
    initialError: string | null;
    preview: PaymentLinkPreview | null;
    uuid: string;
}) {
    const [error, setError] = useState<string | null>(initialError);
    const [isOpening, setIsOpening] = useState(false);
    const payable =
        preview?.status === "ACTIVE" || preview?.status === "PENDING";
    const status = preview ? statusContent[preview.status] : null;

    async function openCheckout() {
        setIsOpening(true);
        setError(null);

        try {
            const payload = await openPaymentLink(uuid);
            window.location.assign(payload.checkoutUrl);
        } catch (reason) {
            let message =
                reason instanceof Error
                    ? reason.message
                    : "Este link não está disponível para pagamento.";

            if (reason instanceof ApiError) {
                if (reason.status === 404 || reason.status === 422) {
                    message =
                        "Não encontramos esta cobrança. Confira se o endereço foi copiado por completo ou peça um novo link ao atendimento.";
                } else if (reason.status === 409) {
                    message =
                        "O pagamento ainda está sendo preparado. Aguarde alguns segundos e tente novamente.";
                } else if (reason.status === 400) {
                    message =
                        "Esta cobrança não pode ser aberta agora. Ela pode ter expirado, já ter sido paga ou ter sido encerrada. Confirme com o atendimento.";
                } else if (reason.status === 502 || reason.status === 503) {
                    message =
                        "O ambiente de pagamento está temporariamente indisponível. Nenhuma cobrança foi confirmada; tente novamente em instantes.";
                }
            }

            setError(message);
            setIsOpening(false);
        }
    }

    return (
        <main className="flex min-h-[72vh] items-center justify-center bg-[#f6f6f8] px-5 py-12">
            <section className="w-full max-w-lg rounded-xl border border-slate-200 bg-white p-7 text-center shadow-sm md:p-10">
                <span className="material-symbols-outlined mx-auto flex size-14 items-center justify-center rounded-full bg-primary/10 text-3xl text-primary">
                    lock
                </span>
                <h1 className="mt-5 font-display text-3xl font-bold text-slate-950">
                    {isOpening
                        ? "Abrindo pagamento seguro"
                        : preview?.description || "Pagamento personalizado"}
                </h1>
                <p className="mt-3 text-sm leading-6 text-slate-600">
                    {isOpening
                        ? "Você será encaminhado para o ambiente protegido da AbacatePay."
                        : status?.description ||
                          "Não foi possível carregar os dados desta cobrança."}
                </p>
                {!isOpening && preview ? (
                    <dl className="mt-6 space-y-4 rounded-lg bg-[#f8f5ef] p-5 text-left">
                        <div>
                            <dt className="text-xs font-bold uppercase tracking-wider text-slate-600">
                                Valor
                            </dt>
                            <dd className="mt-1 text-2xl font-extrabold text-slate-950">
                                {formatCurrency(preview.amountInCents)}
                            </dd>
                        </div>
                        <div>
                            <dt className="text-xs font-bold uppercase tracking-wider text-slate-600">
                                Situação
                            </dt>
                            <dd className="mt-1 font-bold text-slate-900">
                                {status?.label}
                            </dd>
                        </div>
                        <div>
                            <dt className="text-xs font-bold uppercase tracking-wider text-slate-600">
                                Validade
                            </dt>
                            <dd className="mt-1 text-sm text-slate-700">
                                {formatExpiry(preview.expiresAt)}
                            </dd>
                        </div>
                    </dl>
                ) : null}
                {isOpening ? (
                    <span
                        aria-label="Carregando pagamento"
                        className="material-symbols-outlined mt-6 animate-spin text-2xl text-primary motion-reduce:animate-none"
                    >
                        progress_activity
                    </span>
                ) : payable ? (
                    <button
                        className="mt-6 min-h-12 rounded-lg bg-primary px-6 py-3 font-bold text-white focus:outline-none focus:ring-4 focus:ring-primary/30"
                        onClick={() => void openCheckout()}
                        type="button"
                    >
                        Ir para o pagamento seguro
                    </button>
                ) : preview ? (
                    <button
                        className="mt-6 min-h-12 rounded-lg border border-slate-300 bg-slate-100 px-6 py-3 font-bold text-slate-500"
                        disabled
                        type="button"
                    >
                        Pagamento indisponível
                    </button>
                ) : null}
                {!isOpening ? (
                    <a
                        className="mt-4 inline-flex min-h-11 items-center justify-center px-3 py-2 text-sm font-bold text-primary underline-offset-4 hover:underline"
                        href={supportLink}
                        rel="noreferrer"
                        target="_blank"
                    >
                        Confirmar esta cobrança com o atendimento
                    </a>
                ) : null}
            </section>

            <FeedbackDialog
                confirmLabel={preview ? "Tentar novamente" : "Atualizar página"}
                description={error ?? ""}
                onOpenChange={(open) => !open && setError(null)}
                open={error != null}
                onConfirm={() => {
                    if (preview) {
                        void openCheckout();
                        return;
                    }
                    window.location.reload();
                }}
                onSecondary={() => window.open(supportLink, "_blank")}
                secondaryLabel="Falar com o atendimento"
                title="Link indisponível"
            />
        </main>
    );
}
