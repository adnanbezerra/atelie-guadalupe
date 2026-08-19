"use client";

import Link from "next/link";
import { FeedbackDialog } from "@/components/shared/feedback-dialog";
import { useUser } from "@/hooks/use-user";

export function CheckoutSuccessDialog() {
    const { isAuthenticated } = useUser();

    return (
        <FeedbackDialog
            actions={
                isAuthenticated ? (
                    <>
                        <Link
                            className="flex min-h-12 w-full items-center justify-center gap-2 rounded-lg bg-primary px-5 py-3 text-center font-bold text-white shadow-sm hover:bg-primary/90 active:translate-y-px"
                            href="/perfil#pedidos"
                        >
                            <span
                                aria-hidden="true"
                                className="material-symbols-outlined text-xl"
                            >
                                receipt_long
                            </span>
                            Consultar meus pedidos
                        </Link>
                        <Link
                            className="flex min-h-12 w-full items-center justify-center gap-2 rounded-lg border border-slate-200 bg-white px-5 py-3 text-center font-bold text-primary hover:border-primary/20 hover:bg-slate-50 active:translate-y-px"
                            href="/"
                        >
                            <span
                                aria-hidden="true"
                                className="material-symbols-outlined text-xl"
                            >
                                home
                            </span>
                            Voltar ao início
                        </Link>
                    </>
                ) : (
                    <Link
                        className="flex min-h-12 w-full items-center justify-center gap-2 rounded-lg bg-primary px-5 py-3 text-center font-bold text-white shadow-sm hover:bg-primary/90 active:translate-y-px"
                        href="/"
                    >
                        <span
                            aria-hidden="true"
                            className="material-symbols-outlined text-xl"
                        >
                            home
                        </span>
                        Voltar ao início
                    </Link>
                )
            }
            contentClassName="max-w-lg rounded-[2rem] border-primary/10 bg-[#f8f5ef] p-6 sm:p-8"
            description={
                <>
                    <span className="block">
                        Recebemos o retorno do seu pagamento.
                    </span>
                    <span className="mt-5 block border-t border-slate-200 pt-4">
                        <span className="block text-sm font-bold text-slate-900">
                            O que acontece agora
                        </span>
                        <span className="mt-1 block text-sm leading-6 text-slate-600">
                            A operadora enviará uma confirmação automática
                            (webhook) ao Ateliê.
                        </span>
                    </span>
                    <span className="mt-4 block text-sm leading-6 text-slate-600">
                        Este redirecionamento não confirma, sozinho, o status
                        final do pagamento.
                    </span>
                </>
            }
            onOpenChange={() => {}}
            open
            title="Pagamento recebido"
            visual={
                <div className="mb-6 flex items-center justify-between gap-4">
                    <div
                        aria-hidden="true"
                        className="flex size-12 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary ring-1 ring-primary/10"
                    >
                        <span className="material-symbols-outlined text-2xl">
                            hourglass_top
                        </span>
                    </div>
                    <span className="rounded-full bg-amber-50 px-3 py-1.5 text-right text-xs font-bold text-amber-800 ring-1 ring-amber-200">
                        Aguardando confirmação
                    </span>
                </div>
            }
        />
    );
}
