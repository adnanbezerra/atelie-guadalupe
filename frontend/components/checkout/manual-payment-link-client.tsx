"use client";

import { useState } from "react";
import { FeedbackDialog } from "@/components/shared/feedback-dialog";
import { ApiError, openPaymentLink } from "@/lib/api";
import { buildWhatsappLink } from "@/lib/whatsapp";

const supportLink = buildWhatsappLink(
    "Olá! Preciso de ajuda com um link de pagamento personalizado do Ateliê Guadalupe.",
);

export function ManualPaymentLinkClient({ uuid }: { uuid: string }) {
    const [error, setError] = useState<string | null>(null);
    const [isOpening, setIsOpening] = useState(false);

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
                        : "Pagamento personalizado"}
                </h1>
                <p className="mt-3 text-sm leading-6 text-slate-600">
                    {isOpening
                        ? "Você será encaminhado para o ambiente protegido da AbacatePay."
                        : "Confira se este endereço foi enviado pelo Ateliê Guadalupe. O valor, a descrição e a validade serão apresentados no ambiente seguro antes do pagamento."}
                </p>
                {!isOpening ? (
                    <p className="mt-4 rounded-lg bg-[#f8f5ef] p-4 text-left text-sm leading-6 text-slate-700">
                        Continuar apenas cria ou recupera a tela segura. O
                        pagamento só acontece depois da sua confirmação nesse
                        ambiente.
                    </p>
                ) : null}
                {isOpening ? (
                    <span
                        aria-label="Carregando pagamento"
                        className="material-symbols-outlined mt-6 animate-spin text-2xl text-primary motion-reduce:animate-none"
                    >
                        progress_activity
                    </span>
                ) : (
                    <button
                        className="mt-6 min-h-12 rounded-lg bg-primary px-6 py-3 font-bold text-white focus:outline-none focus:ring-4 focus:ring-primary/30"
                        onClick={() => void openCheckout()}
                        type="button"
                    >
                        Ir para o pagamento seguro
                    </button>
                )}
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
                confirmLabel="Tentar novamente"
                description={error ?? ""}
                onOpenChange={(open) => !open && setError(null)}
                open={error != null}
                onConfirm={() => void openCheckout()}
                onSecondary={() => window.open(supportLink, "_blank")}
                secondaryLabel="Falar com o atendimento"
                title="Link indisponível"
            />
        </main>
    );
}
