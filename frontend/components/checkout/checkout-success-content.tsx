"use client";

import Link from "next/link";
import { useUser } from "@/hooks/use-user";

export function CheckoutSuccessContent() {
    const { isAuthenticated } = useUser();

    return (
        <section
            aria-labelledby="checkout-success-title"
            className="w-full max-w-2xl overflow-hidden rounded-2xl bg-white shadow-[0_24px_60px_-32px_rgba(15,23,42,0.4)]"
        >
            <div className="bg-success px-6 py-8 text-white sm:px-10 sm:py-10">
                <span
                    aria-hidden="true"
                    className="material-symbols-outlined flex size-14 items-center justify-center rounded-full bg-white text-3xl text-success shadow-sm"
                >
                    check_circle
                </span>
                <h1
                    className="mt-6 max-w-xl text-balance font-display text-3xl font-bold leading-tight sm:text-4xl"
                    id="checkout-success-title"
                >
                    Pagamento recebido!
                </h1>
                <p className="mt-3 max-w-xl text-base leading-7 text-emerald-50 sm:text-lg">
                    Seu pagamento foi recebido com sucesso.
                </p>
            </div>

            <div className="px-6 py-7 sm:px-10 sm:py-9">
                <h2 className="text-xl font-bold text-slate-950">
                    Agora é só aguardar
                </h2>
                <p className="mt-3 max-w-xl leading-7 text-slate-600">
                    O Ateliê Guadalupe entrará em contato com você para passar
                    os próximos detalhes e, quando houver envio, compartilhar as
                    informações de entrega.
                </p>
                <p className="mt-3 max-w-xl font-medium leading-7 text-slate-700">
                    Você não precisa fazer mais nada por enquanto.
                </p>

                <div className="mt-8 flex flex-col gap-3 sm:flex-row">
                    {isAuthenticated ? (
                        <Link
                            className="flex min-h-12 items-center justify-center gap-2 rounded-lg bg-primary px-5 py-3 text-center font-bold text-white shadow-sm hover:bg-primary/90 active:translate-y-px"
                            href="/perfil#pedidos"
                        >
                            <span
                                aria-hidden="true"
                                className="material-symbols-outlined text-xl"
                            >
                                receipt_long
                            </span>
                            Ver meus pedidos
                        </Link>
                    ) : null}
                    <Link
                        className={`${isAuthenticated ? "border border-slate-200 bg-white text-primary hover:border-primary/20 hover:bg-slate-50" : "bg-primary text-white shadow-sm hover:bg-primary/90"} flex min-h-12 items-center justify-center rounded-lg px-5 py-3 text-center font-bold active:translate-y-px`}
                        href="/"
                    >
                        Voltar ao início
                    </Link>
                </div>
            </div>
        </section>
    );
}
