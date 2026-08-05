"use client";

import { useState } from "react";
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog";
import { openPaymentLink } from "@/lib/api";

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
            setError(
                reason instanceof Error
                    ? reason.message
                    : "Este link não está disponível para pagamento.",
            );
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
                        : "Confira o endereço recebido e continue para o ambiente seguro de pagamento."}
                </p>
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
            </section>

            <Dialog
                onOpenChange={(open) => !open && setError(null)}
                open={error != null}
            >
                <DialogContent className="max-w-md rounded-xl bg-white p-6">
                    <DialogHeader>
                        <DialogTitle className="font-display text-2xl font-bold text-slate-950">
                            Link indisponível
                        </DialogTitle>
                        <DialogDescription className="text-sm leading-6 text-slate-600">
                            {error}
                        </DialogDescription>
                    </DialogHeader>
                    <div className="mt-6 flex justify-end">
                        <button
                            className="rounded-lg bg-primary px-4 py-2 font-bold text-white"
                            onClick={() => setError(null)}
                            type="button"
                        >
                            Entendi
                        </button>
                    </div>
                </DialogContent>
            </Dialog>
        </main>
    );
}
