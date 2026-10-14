"use client";

import { Skeleton } from "@/components/ui/skeleton";
import type { ShippingOption } from "@/lib/shipping";
import { formatCurrency } from "@/lib/utils";

type CheckoutShippingOptionsProps = {
    isLoading: boolean;
    onSelect: (option: ShippingOption) => void;
    options: ShippingOption[];
    selected: ShippingOption | null;
};

export function CheckoutShippingOptions({
    isLoading,
    onSelect,
    options,
    selected,
}: CheckoutShippingOptionsProps) {
    const lowestShipmentId = options.find(
        (option) => option.type === "SHIPMENT",
    )?.id;

    return (
        <section className="overflow-hidden rounded-xl bg-white shadow-sm">
            <div className="border-b border-slate-100 bg-[#f8f5ef] px-5 py-5 sm:px-6">
                <div className="flex items-start gap-4">
                    <span
                        aria-hidden="true"
                        className="material-symbols-outlined flex size-11 shrink-0 items-center justify-center rounded-xl bg-[#d1a054]/15 text-[#9a6b20]"
                    >
                        local_shipping
                    </span>
                    <div>
                        <h2 className="font-display text-xl font-bold text-slate-950">
                            Entrega ou retirada
                        </h2>
                        <p className="mt-1 text-sm leading-6 text-slate-600">
                            Escolha receber no endereço cadastrado ou retirar
                            pessoalmente.
                        </p>
                    </div>
                </div>
            </div>

            <div className="p-5 sm:p-6">
                {isLoading ? (
                    <div
                        aria-label="Calculando opções de entrega"
                        className="space-y-3"
                    >
                        <Skeleton className="h-5 w-36" />
                        <Skeleton className="h-14 w-full rounded-lg" />
                    </div>
                ) : selected ? (
                    <fieldset className="space-y-3">
                        <legend className="mb-3 font-bold text-slate-950">
                            Como você quer receber seu pedido?
                        </legend>
                        {options.map((option) => {
                            const isSelected = selected.id === option.id;
                            const isPickup = option.type === "LOCAL_PICKUP";

                            return (
                                <label
                                    className="flex cursor-pointer items-start gap-3 rounded-xl border border-slate-200 p-4 transition hover:border-slate-300 hover:bg-slate-50 has-[:checked]:border-primary has-[:checked]:bg-primary/5 has-[:focus-visible]:ring-4 has-[:focus-visible]:ring-primary/20"
                                    key={option.id}
                                >
                                    <input
                                        checked={isSelected}
                                        className="mt-0.5 size-5 shrink-0 accent-[#1940b3]"
                                        name="checkout-shipping-option"
                                        onChange={() => onSelect(option)}
                                        type="radio"
                                        value={option.id}
                                    />
                                    <span className="min-w-0 flex-1">
                                        <span className="flex items-start justify-between gap-4">
                                            <span className="flex min-w-0 flex-wrap items-center gap-2 font-bold text-slate-950">
                                                <span>{option.name}</span>
                                                {isPickup ? (
                                                    <span className="inline-flex rounded-full bg-[#d1a054]/15 px-2 py-0.5 text-[0.6875rem] font-bold text-[#795116]">
                                                        Retirada grátis
                                                    </span>
                                                ) : option.id ===
                                                  lowestShipmentId ? (
                                                    <span className="inline-flex rounded-full bg-[#d1a054]/15 px-2 py-0.5 text-[0.6875rem] font-bold text-[#795116]">
                                                        Menor frete
                                                    </span>
                                                ) : null}
                                                {isSelected ? (
                                                    <span className="inline-flex rounded-full bg-primary px-2 py-0.5 text-[0.6875rem] font-bold text-white">
                                                        Selecionado
                                                    </span>
                                                ) : null}
                                            </span>
                                            <span className="shrink-0 font-black text-primary">
                                                {isPickup
                                                    ? "Grátis"
                                                    : formatCurrency(
                                                          option.priceInCents,
                                                      )}
                                            </span>
                                        </span>
                                        <span className="mt-1 block text-sm leading-5 text-slate-600">
                                            {option.deliveryLabel}
                                        </span>
                                        {option.destinationLabel ? (
                                            <span className="mt-1 block text-sm leading-5 text-slate-600">
                                                {option.destinationLabel}
                                            </span>
                                        ) : null}
                                    </span>
                                </label>
                            );
                        })}
                    </fieldset>
                ) : (
                    <p className="text-sm leading-6 text-slate-600">
                        Não foi possível carregar as opções. Confira o endereço
                        e tente novamente.
                    </p>
                )}
            </div>
        </section>
    );
}
