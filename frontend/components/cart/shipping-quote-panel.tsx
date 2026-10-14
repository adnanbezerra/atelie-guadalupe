"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { SavedAddressEditDialog } from "@/components/cart/saved-address-edit-dialog";
import { CheckoutAddressForm } from "@/components/checkout/checkout-address-form";
import { FeedbackDialog } from "@/components/shared/feedback-dialog";
import {
    Dialog,
    DialogClose,
    DialogContent,
    DialogDescription,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog";
import { Skeleton } from "@/components/ui/skeleton";
import { useUser } from "@/hooks/use-user";
import { previewShippingQuote } from "@/lib/api";
import {
    sortDeliveryOptions,
    toDeliveryOption,
    type ShippingOption,
} from "@/lib/shipping";
import type { Cart } from "@/lib/types";
import { formatCurrency } from "@/lib/utils";

export type CartShippingOption = ShippingOption;

type ShippingQuotePanelProps = {
    items: Cart["items"];
    selectedOption: CartShippingOption | null;
    onSelectionChange: (option: CartShippingOption | null) => void;
};

function getAddressLabel(
    address: NonNullable<ReturnType<typeof useUser>["address"]>,
) {
    const street = [address.street, address.number].filter(Boolean).join(", ");
    const location = [address.neighborhood, address.city, address.state]
        .filter(Boolean)
        .join(" · ");

    return [street, location, `CEP ${address.zipCode}`]
        .filter(Boolean)
        .join(" — ");
}

export function ShippingQuotePanel({
    items,
    selectedOption,
    onSelectionChange,
}: ShippingQuotePanelProps) {
    const userContext = useUser();
    const [deliveryOptions, setDeliveryOptions] = useState<ShippingOption[]>(
        [],
    );
    const [isQuoting, setIsQuoting] = useState(false);
    const [isOptionsOpen, setIsOptionsOpen] = useState(false);
    const [feedback, setFeedback] = useState<{
        title: string;
        description: string;
    } | null>(null);
    const quoteRequestIdRef = useRef(0);
    const savedAddress = userContext.address;
    const savedZipCode = savedAddress?.zipCode.replace(/\D/g, "") ?? "";
    const hasSavedAddress = Boolean(savedAddress && savedZipCode.length === 8);
    const addressLabel = savedAddress
        ? getAddressLabel(savedAddress)
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
    const quoteSignature = hasSavedAddress
        ? `${savedZipCode}|${quoteItems
              .map(
                  (item) =>
                      `${item.productUuid}:${item.productSize}:${item.quantity}`,
              )
              .sort()
              .join("|")}`
        : "";

    const requestQuote = useCallback(async () => {
        if (savedZipCode.length !== 8 || !quoteItems.length) return;

        const requestId = ++quoteRequestIdRef.current;
        setIsQuoting(true);
        onSelectionChange(null);

        try {
            const payload = await previewShippingQuote(
                savedZipCode,
                quoteItems,
            );

            if (quoteRequestIdRef.current !== requestId) return;

            const options = sortDeliveryOptions(payload.deliveryOptions).map(
                (option) => toDeliveryOption(option, addressLabel),
            );
            setDeliveryOptions(options);

            if (!options.length) {
                setFeedback({
                    title: "Não há opção de entrega disponível",
                    description:
                        "Não encontramos entrega nem retirada para os produtos do carrinho. Confira o endereço e tente novamente.",
                });
                return;
            }

            onSelectionChange(options[0]);
        } catch (error) {
            if (quoteRequestIdRef.current !== requestId) return;

            setDeliveryOptions([]);
            setFeedback({
                title: "Não foi possível calcular a entrega",
                description:
                    error instanceof Error
                        ? error.message
                        : "Confira sua conexão e tente novamente.",
            });
        } finally {
            if (quoteRequestIdRef.current === requestId) setIsQuoting(false);
        }
    }, [addressLabel, onSelectionChange, quoteItems, savedZipCode]);

    useEffect(() => {
        quoteRequestIdRef.current += 1;
        setDeliveryOptions([]);
        onSelectionChange(null);

        if (!quoteSignature) return;
        void requestQuote();

        return () => {
            quoteRequestIdRef.current += 1;
        };
    }, [onSelectionChange, quoteSignature, requestQuote]);

    function selectOption(option: ShippingOption) {
        onSelectionChange(option);
        setIsOptionsOpen(false);
    }

    return (
        <>
            <div className="border-y border-slate-100 py-4">
                <div className="flex items-start justify-between gap-4 text-sm">
                    <div className="flex min-w-0 gap-2.5">
                        <span
                            aria-hidden="true"
                            className="material-symbols-outlined mt-0.5 text-xl text-[#d1a054]"
                        >
                            local_shipping
                        </span>
                        <div className="min-w-0">
                            <p className="font-semibold text-slate-700">
                                Entrega ou retirada
                            </p>
                            {selectedOption ? (
                                <>
                                    <p className="mt-1 font-bold text-slate-950">
                                        {selectedOption.name}
                                    </p>
                                    <p className="mt-0.5 text-xs leading-5 text-slate-500">
                                        {selectedOption.deliveryLabel}
                                    </p>
                                </>
                            ) : !hasSavedAddress && !userContext.isLoading ? (
                                <p className="mt-1 font-semibold leading-5 text-slate-600">
                                    {savedAddress
                                        ? "O endereço cadastrado está incompleto"
                                        : "Não há endereço cadastrado"}
                                </p>
                            ) : null}
                        </div>
                    </div>
                    <div className="shrink-0 text-right font-bold text-slate-950">
                        {isQuoting || userContext.isLoading ? (
                            <Skeleton className="h-5 w-20" />
                        ) : selectedOption ? (
                            selectedOption.type === "LOCAL_PICKUP" ? (
                                "Grátis"
                            ) : (
                                formatCurrency(selectedOption.priceInCents)
                            )
                        ) : (
                            "—"
                        )}
                    </div>
                </div>

                {hasSavedAddress && deliveryOptions.length ? (
                    <div className="flex flex-wrap items-center gap-x-2">
                        <button
                            className="mt-3 inline-flex min-h-11 items-center gap-1.5 rounded-lg px-2 text-sm font-bold text-primary transition hover:bg-primary/5 focus:outline-none focus:ring-4 focus:ring-primary/20"
                            onClick={() => setIsOptionsOpen(true)}
                            type="button"
                        >
                            Ver opções de entrega
                            <span
                                aria-hidden="true"
                                className="material-symbols-outlined text-lg"
                            >
                                arrow_forward
                            </span>
                        </button>
                        {savedAddress ? (
                            <SavedAddressEditDialog
                                address={savedAddress}
                                onSaved={() => setIsOptionsOpen(false)}
                            />
                        ) : null}
                    </div>
                ) : null}

                {hasSavedAddress && !isQuoting && !deliveryOptions.length ? (
                    <button
                        className="mt-3 inline-flex min-h-11 items-center gap-2 rounded-lg px-2 text-sm font-bold text-primary transition hover:bg-primary/5 focus:outline-none focus:ring-4 focus:ring-primary/20"
                        onClick={() => void requestQuote()}
                        type="button"
                    >
                        Tentar calcular novamente
                    </button>
                ) : null}
            </div>

            {!userContext.isLoading && !hasSavedAddress ? (
                userContext.isAuthenticated ? (
                    <div className="border-b border-slate-100 py-5">
                        <CheckoutAddressForm
                            address={savedAddress}
                            embedded
                            onError={(title, description) =>
                                setFeedback({ title, description })
                            }
                            onSaved={() => undefined}
                        />
                    </div>
                ) : (
                    <p className="border-b border-slate-100 py-4 text-sm leading-6 text-slate-600">
                        Entre na sua conta para cadastrar o endereço e calcular
                        a entrega.
                    </p>
                )
            ) : null}

            <Dialog open={isOptionsOpen} onOpenChange={setIsOptionsOpen}>
                <DialogContent className="max-h-[calc(100dvh-2rem)] max-w-xl overflow-y-auto bg-white">
                    <DialogHeader className="border-b border-slate-100 px-6 py-5 pr-16">
                        <DialogTitle className="font-display text-2xl font-bold text-slate-950">
                            Entrega ou retirada
                        </DialogTitle>
                        <DialogDescription className="text-sm leading-6 text-slate-600">
                            Escolha receber no endereço cadastrado ou retirar
                            pessoalmente.
                        </DialogDescription>
                    </DialogHeader>
                    <DialogClose asChild>
                        <button
                            aria-label="Fechar opções de entrega"
                            className="absolute right-5 top-5 flex size-11 items-center justify-center rounded-lg text-slate-600 transition hover:bg-slate-100 focus:outline-none focus:ring-4 focus:ring-primary/20"
                            type="button"
                        >
                            <span
                                aria-hidden="true"
                                className="material-symbols-outlined"
                            >
                                close
                            </span>
                        </button>
                    </DialogClose>
                    <fieldset className="space-y-3 p-6">
                        <legend className="sr-only">
                            Como você quer receber seu pedido?
                        </legend>
                        {deliveryOptions.map((option) => {
                            const isPickup = option.type === "LOCAL_PICKUP";
                            return (
                                <label
                                    className="flex cursor-pointer items-start gap-3 rounded-xl border border-slate-200 p-4 transition hover:border-primary/30 has-[:checked]:border-primary has-[:checked]:bg-primary/5 has-[:checked]:ring-2 has-[:checked]:ring-primary/15"
                                    key={option.id}
                                >
                                    <input
                                        checked={
                                            selectedOption?.id === option.id
                                        }
                                        className="mt-1 accent-[#1940b3]"
                                        name="cart-shipping-option"
                                        onChange={() => selectOption(option)}
                                        type="radio"
                                        value={option.id}
                                    />
                                    <span className="min-w-0 flex-1">
                                        <span className="flex items-start justify-between gap-4">
                                            <span className="font-bold text-slate-950">
                                                {option.name}
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
                </DialogContent>
            </Dialog>

            <FeedbackDialog
                confirmLabel={hasSavedAddress ? "Tentar novamente" : "Entendi"}
                description={feedback?.description ?? ""}
                onConfirm={
                    hasSavedAddress ? () => void requestQuote() : undefined
                }
                onOpenChange={(open) => !open && setFeedback(null)}
                open={feedback != null}
                title={feedback?.title ?? ""}
            />
        </>
    );
}
