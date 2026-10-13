"use client";

import { useRef } from "react";
import { Skeleton } from "@/components/ui/skeleton";
import { getShippingDeliveryLabel, type ShippingOption } from "@/lib/shipping";
import type { ShippingQuoteService } from "@/lib/types";
import { formatCurrency } from "@/lib/utils";

type CheckoutShippingOptionsProps = {
    isLoading: boolean;
    onSelect: (service: ShippingQuoteService) => void;
    selected: ShippingOption | null;
    services: ShippingQuoteService[];
};

export function CheckoutShippingOptions({
    isLoading,
    onSelect,
    selected,
    services,
}: CheckoutShippingOptionsProps) {
    const detailsRef = useRef<HTMLDetailsElement | null>(null);

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
                            Frete
                        </h2>
                        <p className="mt-1 text-sm leading-6 text-slate-600">
                            Reveja os prazos e escolha outra opção antes de
                            confirmar.
                        </p>
                    </div>
                </div>
            </div>

            <div className="p-5 sm:p-6">
                {isLoading ? (
                    <div
                        aria-label="Calculando opções de frete"
                        className="space-y-3"
                    >
                        <Skeleton className="h-5 w-36" />
                        <Skeleton className="h-14 w-full rounded-lg" />
                    </div>
                ) : selected ? (
                    <details
                        className="group rounded-xl border border-slate-200 open:border-primary/30"
                        ref={detailsRef}
                    >
                        <summary className="flex min-h-14 cursor-pointer list-none items-center justify-between gap-4 rounded-xl px-4 py-3 focus:outline-none focus:ring-4 focus:ring-primary/20 [&::-webkit-details-marker]:hidden">
                            <span className="min-w-0">
                                <span className="block font-bold text-slate-950">
                                    {selected.name}
                                </span>
                                <span className="mt-0.5 block text-sm leading-5 text-slate-600">
                                    {selected.deliveryLabel}
                                </span>
                            </span>
                            <span className="flex shrink-0 items-center gap-2">
                                <span className="font-black text-primary">
                                    {formatCurrency(selected.priceInCents)}
                                </span>
                                <span
                                    aria-hidden="true"
                                    className="material-symbols-outlined text-xl text-slate-500 transition-transform group-open:rotate-180"
                                >
                                    expand_more
                                </span>
                            </span>
                        </summary>

                        <fieldset className="space-y-2 border-t border-slate-100 p-3">
                            <legend className="sr-only">
                                Opções de frete disponíveis
                            </legend>
                            {services.map((service, index) => (
                                <label
                                    className="flex cursor-pointer items-start gap-3 rounded-lg p-3 transition hover:bg-slate-50 has-[:checked]:bg-primary/5"
                                    key={service.serviceCode}
                                >
                                    <input
                                        checked={
                                            selected.serviceCode ===
                                            service.serviceCode
                                        }
                                        className="mt-1 accent-[#1940b3]"
                                        name="checkout-shipping-option"
                                        onChange={() => {
                                            onSelect(service);
                                            if (detailsRef.current) {
                                                detailsRef.current.open = false;
                                            }
                                        }}
                                        type="radio"
                                    />
                                    <span className="min-w-0 flex-1">
                                        <span className="flex items-start justify-between gap-4">
                                            <span className="font-bold text-slate-950">
                                                {service.serviceName}
                                                {index === 0 ? (
                                                    <span className="ml-2 inline-flex rounded-full bg-[#d1a054]/15 px-2 py-0.5 align-middle text-[0.6875rem] font-bold text-[#795116]">
                                                        Mais barato
                                                    </span>
                                                ) : null}
                                            </span>
                                            <span className="shrink-0 font-black text-primary">
                                                {formatCurrency(
                                                    service.priceInCents,
                                                )}
                                            </span>
                                        </span>
                                        <span className="mt-1 block text-sm leading-5 text-slate-600">
                                            {getShippingDeliveryLabel(service)}
                                        </span>
                                    </span>
                                </label>
                            ))}
                        </fieldset>
                    </details>
                ) : (
                    <p className="text-sm leading-6 text-slate-600">
                        Salve o endereço para ver as opções de frete.
                    </p>
                )}
            </div>
        </section>
    );
}
