"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { SavedAddressEditDialog } from "@/components/cart/saved-address-edit-dialog";
import {
    fetchViaCepAddress,
    formatCep,
    onlyDigits,
} from "@/components/profile/profile-page-helpers";
import { Skeleton } from "@/components/ui/skeleton";
import { useUser } from "@/hooks/use-user";
import { previewShippingQuote } from "@/lib/api";
import type { Cart, ShippingQuoteService } from "@/lib/types";
import { formatCurrency } from "@/lib/utils";

type AddressPreview = {
    zipCode: string;
    street: string;
    number?: string;
    neighborhood: string;
    city: string;
    state: string;
};

export type CartShippingOption = {
    id: string;
    kind: "pickup" | "delivery";
    serviceCode?: number;
    name: string;
    priceInCents: number;
    deliveryLabel: string;
    destinationLabel?: string;
};

type ShippingQuotePanelProps = {
    items: Cart["items"];
    selectedOption: CartShippingOption | null;
    onSelectionChange: (option: CartShippingOption | null) => void;
};

const pickupOption: CartShippingOption = {
    id: "atelier-pickup",
    kind: "pickup",
    name: "Retirar no Ateliê",
    priceInCents: 0,
    deliveryLabel: "Combine o horário e busque seu pedido no ateliê.",
};

function getDeliveryLabel(service: ShippingQuoteService) {
    const { min, max } = service.deliveryRange;

    if (min != null && max != null) {
        return min === max
            ? `Chega em ${max} dias úteis`
            : `Chega de ${min} a ${max} dias úteis`;
    }

    if (service.deliveryDays != null) {
        return `Chega em até ${service.deliveryDays} dias úteis`;
    }

    return "Prazo confirmado ao finalizar o pedido";
}

function getAddressLabel(address: AddressPreview) {
    const street = [address.street, address.number].filter(Boolean).join(", ");
    const location = [address.neighborhood, address.city, address.state]
        .filter(Boolean)
        .join(" · ");

    return [street, location, `CEP ${formatCep(address.zipCode)}`]
        .filter(Boolean)
        .join(" — ");
}

export function ShippingQuotePanel({
    items,
    selectedOption,
    onSelectionChange,
}: ShippingQuotePanelProps) {
    const userContext = useUser();
    const [zipCode, setZipCode] = useState("");
    const [manualAddress, setManualAddress] = useState<AddressPreview | null>(
        null,
    );
    const [quotedServices, setQuotedServices] = useState<
        ShippingQuoteService[]
    >([]);
    const [isCepLoading, setIsCepLoading] = useState(false);
    const [isQuoting, setIsQuoting] = useState(false);
    const [cepError, setCepError] = useState<string | null>(null);
    const [quoteError, setQuoteError] = useState<string | null>(null);
    const [hasCalculated, setHasCalculated] = useState(false);
    const lastCepRequestRef = useRef("");

    const savedAddress = userContext.address;
    const savedZipCode = onlyDigits(savedAddress?.zipCode ?? "", 8);
    const hasValidSavedAddress = savedZipCode.length === 8;
    const showZipInput =
        !userContext.isAuthenticated ||
        (!userContext.isLoading && !hasValidSavedAddress);
    const savedAddressPreview = useMemo<AddressPreview | null>(
        () =>
            hasValidSavedAddress && savedAddress
                ? {
                      zipCode: savedZipCode,
                      street: savedAddress.street,
                      number: savedAddress.number,
                      neighborhood: savedAddress.neighborhood,
                      city: savedAddress.city,
                      state: savedAddress.state,
                  }
                : null,
        [hasValidSavedAddress, savedAddress, savedZipCode],
    );
    const addressPreview = savedAddressPreview ?? manualAddress;
    const addressLabel = addressPreview
        ? getAddressLabel(addressPreview)
        : undefined;
    const quoteItems = useMemo(
        () =>
            items.map((item) => ({
                productUuid: item.productUuid,
                productSize: item.productSize,
                quantity: item.quantity,
            })),
        [items],
    );
    const cartSignature = quoteItems
        .map(
            (item) =>
                `${item.productUuid}:${item.productSize}:${item.quantity}`,
        )
        .join("|");

    useEffect(() => {
        if (savedAddressPreview) {
            setZipCode(formatCep(savedAddressPreview.zipCode));
            setManualAddress(null);
            setCepError(null);
            return;
        }

        if (!userContext.isLoading) {
            setZipCode("");
            setManualAddress(null);
        }
    }, [savedAddressPreview, userContext.isLoading]);

    useEffect(() => {
        setQuotedServices([]);
        setQuoteError(null);
        setHasCalculated(false);
        onSelectionChange(null);
    }, [cartSignature, onSelectionChange]);

    function resetQuote() {
        setQuotedServices([]);
        setQuoteError(null);
        setHasCalculated(false);
        onSelectionChange(null);
    }

    async function handleZipCodeChange(value: string) {
        const formattedValue = formatCep(value);
        const cleanZipCode = onlyDigits(formattedValue, 8);

        setZipCode(formattedValue);
        setManualAddress(null);
        setCepError(null);
        resetQuote();

        if (cleanZipCode.length !== 8) {
            lastCepRequestRef.current = "";
            setIsCepLoading(false);
            return;
        }

        lastCepRequestRef.current = cleanZipCode;
        setIsCepLoading(true);

        try {
            const payload = await fetchViaCepAddress(cleanZipCode);

            if (lastCepRequestRef.current !== cleanZipCode) {
                return;
            }

            if (!payload) {
                setCepError(
                    "CEP não encontrado. Confira os números digitados.",
                );
                return;
            }

            setManualAddress({
                zipCode: cleanZipCode,
                street: payload.logradouro ?? "",
                neighborhood: payload.bairro ?? "",
                city: payload.localidade ?? "",
                state: payload.uf ?? "",
            });
        } catch {
            if (lastCepRequestRef.current === cleanZipCode) {
                setCepError(
                    "Não foi possível buscar este CEP. Tente novamente.",
                );
            }
        } finally {
            if (lastCepRequestRef.current === cleanZipCode) {
                setIsCepLoading(false);
            }
        }
    }

    async function handleQuote() {
        const cleanZipCode = onlyDigits(addressPreview?.zipCode ?? zipCode, 8);

        if (
            cleanZipCode.length !== 8 ||
            !addressPreview ||
            !quoteItems.length
        ) {
            return;
        }

        setIsQuoting(true);
        setQuoteError(null);
        setHasCalculated(true);
        onSelectionChange(null);

        try {
            const payload = await previewShippingQuote(
                cleanZipCode,
                quoteItems,
            );
            setQuotedServices(payload.quotedServices);

            if (!payload.quotedServices.length) {
                setQuoteError(
                    "Nenhuma entrega foi encontrada para este CEP. A retirada no ateliê continua disponível.",
                );
            }
        } catch (caughtError) {
            setQuotedServices([]);
            setQuoteError(
                caughtError instanceof Error
                    ? `${caughtError.message} A retirada no ateliê continua disponível.`
                    : "Não foi possível calcular as entregas. A retirada no ateliê continua disponível.",
            );
        } finally {
            setIsQuoting(false);
        }
    }

    function selectDelivery(service: ShippingQuoteService) {
        onSelectionChange({
            id: `shipping-${service.serviceCode}`,
            kind: "delivery",
            serviceCode: service.serviceCode,
            name: service.serviceName,
            priceInCents: service.priceInCents,
            deliveryLabel: getDeliveryLabel(service),
            destinationLabel: addressLabel,
        });
    }

    return (
        <section className="overflow-hidden rounded-2xl border border-[#d1a054]/30 bg-[#f8f5ef] shadow-sm">
            <div className="border-b border-[#d1a054]/20 px-6 py-5">
                <div className="flex items-start gap-3">
                    <span className="material-symbols-outlined mt-0.5 text-[#d1a054]">
                        local_shipping
                    </span>
                    <div>
                        <h2 className="font-display text-xl font-bold text-slate-900">
                            Como você quer receber?
                        </h2>
                        <p className="mt-1 text-sm leading-6 text-slate-600">
                            Confirme o destino para ver os valores de entrega.
                        </p>
                    </div>
                </div>
            </div>

            <div className="space-y-4 p-5">
                {userContext.isAuthenticated && userContext.isLoading ? (
                    <div className="space-y-3" aria-label="Carregando endereço">
                        <Skeleton className="h-4 w-28" />
                        <Skeleton className="h-20 w-full rounded-xl bg-white" />
                    </div>
                ) : null}

                {showZipInput && !userContext.isLoading ? (
                    <div>
                        <label
                            className="text-xs font-bold uppercase tracking-[0.12em] text-slate-700"
                            htmlFor="shipping-zip-code"
                        >
                            CEP de entrega
                        </label>
                        <div className="relative mt-2">
                            <input
                                aria-describedby={
                                    cepError ? "shipping-zip-error" : undefined
                                }
                                aria-invalid={Boolean(cepError)}
                                autoComplete="postal-code"
                                className="w-full rounded-lg border border-slate-200 bg-white px-4 py-3 pr-11 text-base font-semibold text-slate-900 outline-none transition focus:border-primary focus:ring-4 focus:ring-primary/15"
                                id="shipping-zip-code"
                                inputMode="numeric"
                                maxLength={9}
                                onChange={(event) => {
                                    void handleZipCodeChange(
                                        event.currentTarget.value,
                                    );
                                }}
                                placeholder="00000-000"
                                type="text"
                                value={zipCode}
                            />
                            <span className="material-symbols-outlined pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-xl text-slate-400">
                                {isCepLoading
                                    ? "progress_activity"
                                    : "pin_drop"}
                            </span>
                        </div>
                        {cepError ? (
                            <p
                                className="mt-2 text-sm font-semibold text-red-700"
                                id="shipping-zip-error"
                            >
                                {cepError}
                            </p>
                        ) : null}
                    </div>
                ) : null}

                {addressPreview ? (
                    <div className="rounded-xl border border-primary/10 bg-white p-4 shadow-sm">
                        <div className="flex gap-3">
                            <span className="material-symbols-outlined text-primary">
                                location_on
                            </span>
                            <div className="min-w-0">
                                <p className="text-xs font-bold uppercase tracking-[0.12em] text-primary">
                                    {savedAddressPreview
                                        ? "Endereço salvo"
                                        : "Endereço encontrado"}
                                </p>
                                {addressPreview.street ? (
                                    <p className="mt-1 font-bold text-slate-900">
                                        {addressPreview.street}
                                        {addressPreview.number
                                            ? `, ${addressPreview.number}`
                                            : ""}
                                    </p>
                                ) : null}
                                <p className="mt-1 text-sm leading-5 text-slate-600">
                                    {[
                                        addressPreview.neighborhood,
                                        addressPreview.city,
                                        addressPreview.state,
                                    ]
                                        .filter(Boolean)
                                        .join(" · ")}
                                </p>
                                <p className="mt-1 text-sm font-semibold text-slate-500">
                                    CEP {formatCep(addressPreview.zipCode)}
                                </p>
                                {savedAddressPreview && savedAddress ? (
                                    <SavedAddressEditDialog
                                        address={savedAddress}
                                        onSaved={resetQuote}
                                    />
                                ) : null}
                            </div>
                        </div>
                    </div>
                ) : null}

                <button
                    className="flex min-h-12 w-full items-center justify-center gap-2 rounded-lg bg-primary px-4 py-3 text-sm font-bold text-white shadow-md shadow-primary/20 transition hover:brightness-110 focus:outline-none focus:ring-4 focus:ring-primary/30 disabled:cursor-not-allowed disabled:opacity-50"
                    disabled={
                        !addressPreview ||
                        isCepLoading ||
                        isQuoting ||
                        !items.length
                    }
                    onClick={() => {
                        void handleQuote();
                    }}
                    type="button"
                >
                    <span className="material-symbols-outlined text-xl">
                        {isQuoting ? "progress_activity" : "calculate"}
                    </span>
                    {isQuoting ? "Calculando entrega..." : "Calcular entrega"}
                </button>

                {quoteError ? (
                    <p
                        className="rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-sm leading-5 text-amber-900"
                        role="status"
                    >
                        {quoteError}
                    </p>
                ) : null}

                {hasCalculated && !isQuoting ? (
                    <fieldset className="space-y-3">
                        <legend className="mb-3 text-xs font-bold uppercase tracking-[0.12em] text-slate-700">
                            Escolha uma opção
                        </legend>

                        <label className="flex cursor-pointer items-center gap-3 rounded-xl border border-slate-200 bg-white p-4 transition has-[:checked]:border-primary has-[:checked]:ring-2 has-[:checked]:ring-primary/15">
                            <input
                                checked={selectedOption?.id === pickupOption.id}
                                className="mt-1 accent-[#1940b3]"
                                name="shipping-option"
                                onChange={() => onSelectionChange(pickupOption)}
                                type="radio"
                                value={pickupOption.id}
                            />
                            <span className="material-symbols-outlined text-[#d1a054]">
                                storefront
                            </span>
                            <span className="min-w-0 flex-1">
                                <span className="flex items-start justify-between gap-3">
                                    <span className="font-bold text-slate-900">
                                        {pickupOption.name}
                                    </span>
                                    <span className="font-black text-emerald-700">
                                        Grátis
                                    </span>
                                </span>
                                <span className="mt-1 block text-sm leading-5 text-slate-600">
                                    {pickupOption.deliveryLabel}
                                </span>
                            </span>
                        </label>

                        {quotedServices.map((service) => {
                            const optionId = `shipping-${service.serviceCode}`;

                            return (
                                <label
                                    className="items-center flex cursor-pointer gap-3 rounded-xl border border-slate-200 bg-white p-4 transition has-[:checked]:border-primary has-[:checked]:ring-2 has-[:checked]:ring-primary/15"
                                    key={service.serviceCode}
                                >
                                    <input
                                        checked={
                                            selectedOption?.id === optionId
                                        }
                                        className="mt-1 accent-[#1940b3]"
                                        name="shipping-option"
                                        onChange={() => selectDelivery(service)}
                                        type="radio"
                                        value={optionId}
                                    />
                                    <span className="material-symbols-outlined text-primary">
                                        package_2
                                    </span>
                                    <span className="min-w-0 flex-1">
                                        <span className="flex items-start justify-between gap-3">
                                            <span className="font-bold text-slate-900">
                                                {service.serviceName}
                                            </span>
                                            <span className="font-black text-primary">
                                                {formatCurrency(
                                                    service.priceInCents,
                                                )}
                                            </span>
                                        </span>
                                        <span className="mt-1 block text-sm leading-5 text-slate-600">
                                            {getDeliveryLabel(service)}
                                        </span>
                                    </span>
                                </label>
                            );
                        })}

                        {quotedServices.length ? (
                            <p className="px-1 text-xs leading-5 text-slate-500">
                                A entregadora pode ter que recalcular o seu
                                frete no momento da finalização do pedido.
                            </p>
                        ) : null}
                    </fieldset>
                ) : null}
            </div>
        </section>
    );
}
