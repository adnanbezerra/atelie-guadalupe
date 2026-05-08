"use client";

export function ProfilePaymentView() {
    return (
        <div className="rounded-3xl border border-slate-100 bg-white p-8 shadow-sm md:p-12">
            <div className="mb-10">
                <h2 className="text-2xl font-extrabold tracking-tight text-slate-900">
                    Informações de Pagamento
                </h2>
                <p className="mt-1 text-slate-500">
                    Métodos salvos ainda não estão disponíveis.
                </p>
            </div>

            <div className="rounded-3xl border border-dashed border-slate-200 bg-slate-50 px-6 py-12 text-center">
                <span className="material-symbols-outlined text-4xl text-slate-300">
                    payments
                </span>
                <h3 className="mt-4 text-lg font-extrabold text-slate-900">
                    Sem métodos salvos
                </h3>
                <p className="mx-auto mt-2 max-w-md text-sm leading-6 text-slate-500">
                    Por enquanto, escolha Pix, crédito ou débito ao finalizar o
                    pedido.
                </p>
            </div>
        </div>
    );
}
