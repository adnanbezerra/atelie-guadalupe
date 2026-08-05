import type { FormEvent } from "react";

type BillingFormProps = {
    amount: string;
    description: string;
    expiresAt: string;
    isSubmitting: boolean;
    onAmountChange: (value: string) => void;
    onDescriptionChange: (value: string) => void;
    onExpirationChange: (value: string) => void;
    onSubmit: (event: FormEvent<HTMLFormElement>) => void;
};

export function BillingForm({
    amount,
    description,
    expiresAt,
    isSubmitting,
    onAmountChange,
    onDescriptionChange,
    onExpirationChange,
    onSubmit,
}: BillingFormProps) {
    return (
        <section className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm md:p-7">
            <div className="flex items-start gap-3 border-b border-slate-100 pb-5">
                <span className="material-symbols-outlined flex size-10 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
                    add_link
                </span>
                <div>
                    <h2 className="text-lg font-bold text-slate-950">
                        Dados da cobrança
                    </h2>
                    <p className="mt-1 text-sm leading-5 text-slate-500">
                        O cliente verá a descrição e o valor antes de pagar.
                    </p>
                </div>
            </div>

            <form className="mt-6 space-y-5" noValidate onSubmit={onSubmit}>
                <div>
                    <label
                        className="mb-2 block text-sm font-bold text-slate-800"
                        htmlFor="billing-description"
                    >
                        Descrição
                    </label>
                    <textarea
                        className="min-h-28 w-full resize-y rounded-lg border border-slate-300 bg-white px-4 py-3 text-sm leading-6 outline-none transition focus:border-primary focus:ring-4 focus:ring-primary/15"
                        id="billing-description"
                        maxLength={500}
                        onChange={(event) =>
                            onDescriptionChange(event.currentTarget.value)
                        }
                        placeholder="Ex.: Encomenda personalizada para Maria"
                        value={description}
                    />
                    <p className="mt-1.5 text-right font-public text-xs text-slate-500">
                        {description.length}/500
                    </p>
                </div>

                <div className="grid gap-5 sm:grid-cols-2">
                    <div>
                        <label
                            className="mb-2 block text-sm font-bold text-slate-800"
                            htmlFor="billing-amount"
                        >
                            Valor da cobrança
                        </label>
                        <div className="relative">
                            <span className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 font-bold text-slate-500">
                                R$
                            </span>
                            <input
                                className="h-12 w-full rounded-lg border border-slate-300 bg-white pl-12 pr-4 text-base font-bold text-slate-950 outline-none transition focus:border-primary focus:ring-4 focus:ring-primary/15"
                                id="billing-amount"
                                inputMode="decimal"
                                min="0.01"
                                onChange={(event) =>
                                    onAmountChange(event.currentTarget.value)
                                }
                                placeholder="0,00"
                                step="0.01"
                                type="number"
                                value={amount}
                            />
                        </div>
                    </div>

                    <div>
                        <label
                            className="mb-2 block text-sm font-bold text-slate-800"
                            htmlFor="billing-expiration"
                        >
                            Data de vencimento{" "}
                            <span className="font-normal text-slate-500">
                                (opcional)
                            </span>
                        </label>
                        <input
                            className="h-12 w-full rounded-lg border border-slate-300 bg-white px-4 text-sm text-slate-900 outline-none transition focus:border-primary focus:ring-4 focus:ring-primary/15"
                            id="billing-expiration"
                            onChange={(event) =>
                                onExpirationChange(event.currentTarget.value)
                            }
                            type="datetime-local"
                            value={expiresAt}
                        />
                    </div>
                </div>

                <div className="rounded-lg border border-blue-100 bg-blue-50/70 p-4 text-sm leading-6 text-blue-950">
                    <div className="flex gap-3">
                        <span className="material-symbols-outlined mt-0.5 text-xl text-primary">
                            info
                        </span>
                        <p>
                            Este link não reserva estoque nem cria pedido ou
                            frete. Ele serve apenas para uma cobrança avulsa.
                        </p>
                    </div>
                </div>

                <button
                    className="flex min-h-12 w-full items-center justify-center gap-2 rounded-lg bg-primary px-5 py-3 font-bold text-white shadow-md shadow-primary/20 transition hover:brightness-110 focus:outline-none focus:ring-4 focus:ring-primary/30 disabled:cursor-not-allowed disabled:opacity-60"
                    disabled={isSubmitting}
                    type="submit"
                >
                    <span className="material-symbols-outlined text-xl">
                        link
                    </span>
                    {isSubmitting
                        ? "Gerando link..."
                        : "Gerar link de pagamento"}
                </button>
            </form>
        </section>
    );
}
