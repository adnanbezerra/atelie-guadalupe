const checkoutSteps = [
    ["local_shipping", "Entrega"],
    ["receipt_long", "Conferência"],
    ["verified_user", "Pagamento"],
] as const;

export function CheckoutSteps({ currentStep }: { currentStep: number }) {
    return (
        <ol className="mt-8 grid overflow-hidden rounded-xl border border-slate-200 bg-white sm:grid-cols-3">
            {checkoutSteps.map(([icon, label], index) => {
                const step = index + 1;
                const active = step <= currentStep;

                return (
                    <li
                        className={`flex min-h-20 items-center gap-3 px-5 py-4 ${index ? "border-t border-slate-200 sm:border-l sm:border-t-0" : ""}`}
                        key={label}
                    >
                        <span
                            className={`material-symbols-outlined flex size-10 items-center justify-center rounded-full ${active ? "bg-primary text-white" : "bg-slate-100 text-slate-400"}`}
                        >
                            {icon}
                        </span>
                        <span>
                            <span className="block font-public text-[0.68rem] font-bold uppercase tracking-[0.14em] text-slate-500">
                                Etapa {step}
                            </span>
                            <span className="mt-0.5 block font-bold text-slate-900">
                                {label}
                            </span>
                        </span>
                    </li>
                );
            })}
        </ol>
    );
}
