"use client";

import {
    type ComponentProps,
    type FormEvent,
    useEffect,
    useRef,
    useState,
} from "react";
import {
    fetchViaCepAddress,
    formatCep,
    onlyDigits,
} from "@/components/profile/profile-page-helpers";
import { useApiToken } from "@/hooks/use-api-token";
import { useUser } from "@/hooks/use-user";
import {
    clearAddressZipCodeDraft,
    readAddressZipCodeDraft,
} from "@/lib/address-draft";
import { updateCurrentUser } from "@/lib/api";
import type { Address } from "@/lib/types";

type CheckoutAddressFormProps = {
    address?: Address | null;
    onError: (title: string, description: string) => void;
    onSaved: () => void;
};

function AddressInput({
    id,
    label,
    wide,
    ...inputProps
}: ComponentProps<"input"> & {
    id: string;
    label: string;
    wide?: boolean;
}) {
    return (
        <div className={wide ? "space-y-2 sm:col-span-2" : "space-y-2"}>
            <label className="text-sm font-bold text-slate-800" htmlFor={id}>
                {label}
            </label>
            <input
                className="min-h-12 w-full rounded-lg border border-slate-300 bg-white px-4 py-3 font-medium text-slate-900 outline-none placeholder:text-slate-500 focus:border-primary focus:ring-4 focus:ring-primary/15"
                id={id}
                type="text"
                {...inputProps}
            />
        </div>
    );
}

export function CheckoutAddressForm({
    address,
    onError,
    onSaved,
}: CheckoutAddressFormProps) {
    const token = useApiToken();
    const userContext = useUser();
    const formRef = useRef<HTMLFormElement | null>(null);
    const lastCepRequestRef = useRef("");
    const [zipCode, setZipCode] = useState(
        address ? formatCep(address.zipCode) : "",
    );
    const [isCepLoading, setIsCepLoading] = useState(false);
    const [isSubmitting, setIsSubmitting] = useState(false);

    function setAddressField(name: string, value: string) {
        const field = formRef.current?.elements.namedItem(name);

        if (field instanceof HTMLInputElement) field.value = value;
    }

    async function findAddress(cleanZipCode: string) {
        lastCepRequestRef.current = cleanZipCode;
        setIsCepLoading(true);

        try {
            const payload = await fetchViaCepAddress(cleanZipCode);

            if (lastCepRequestRef.current !== cleanZipCode) return;

            if (!payload) {
                onError(
                    "CEP não encontrado",
                    "Confira os números digitados e tente novamente.",
                );
                return;
            }

            setAddressField("street", (payload.logradouro ?? "").slice(0, 30));
            setAddressField("neighborhood", payload.bairro ?? "");
            setAddressField("city", payload.localidade ?? "");
            setAddressField("state", payload.uf ?? "");
            setAddressField("country", "Brasil");
        } catch {
            if (lastCepRequestRef.current === cleanZipCode) {
                onError(
                    "Não foi possível consultar o CEP",
                    "Verifique sua conexão e tente novamente. Você também pode preencher o endereço manualmente.",
                );
            }
        } finally {
            if (lastCepRequestRef.current === cleanZipCode) {
                setIsCepLoading(false);
            }
        }
    }

    useEffect(() => {
        if (address) return;

        const draftZipCode = readAddressZipCodeDraft();

        if (!draftZipCode) return;
        setZipCode(formatCep(draftZipCode));
        void findAddress(draftZipCode);

        return () => {
            lastCepRequestRef.current = "";
        };
        // O rascunho deve ser lido uma vez ao abrir o formulário.
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [address]);

    async function handleSubmit(event: FormEvent<HTMLFormElement>) {
        event.preventDefault();

        if (!token || isCepLoading || isSubmitting) return;

        const formData = new FormData(event.currentTarget);
        const getField = (name: string) =>
            String(formData.get(name) ?? "").trim();

        if (getField("street").length > 30) {
            onError(
                "Confira o endereço",
                "A rua deve ter no máximo 30 caracteres para a transportadora.",
            );
            return;
        }

        setIsSubmitting(true);

        try {
            const response = await updateCurrentUser(token, {
                address: {
                    ...(address?.uuid ? { uuid: address.uuid } : {}),
                    zipCode: onlyDigits(getField("zipCode"), 8),
                    street: getField("street"),
                    number: getField("number"),
                    complement: getField("complement"),
                    neighborhood: getField("neighborhood"),
                    city: getField("city"),
                    state: getField("state").toUpperCase(),
                    country: getField("country"),
                },
            });

            userContext.setUser(response.user);
            clearAddressZipCodeDraft();
            onSaved();
        } catch (error) {
            onError(
                "Não foi possível salvar o endereço",
                error instanceof Error
                    ? error.message
                    : "Confira os dados e tente novamente.",
            );
        } finally {
            setIsSubmitting(false);
        }
    }

    return (
        <section className="overflow-hidden rounded-xl bg-white shadow-sm">
            <div className="border-b border-slate-100 bg-[#f8f5ef] px-5 py-5 sm:px-6">
                <div className="flex items-start gap-4">
                    <span
                        aria-hidden="true"
                        className="material-symbols-outlined flex size-11 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary"
                    >
                        add_location_alt
                    </span>
                    <div>
                        <h2 className="font-display text-xl font-bold text-slate-950">
                            {address
                                ? "Ajuste o endereço de entrega"
                                : "Cadastre o endereço de entrega"}
                        </h2>
                        <p className="mt-1 max-w-2xl text-sm leading-6 text-slate-600">
                            {address
                                ? "A rua deve ter no máximo 30 caracteres para a transportadora. Confira e salve para continuar."
                                : "Complete os dados aqui mesmo para seguir com seu pedido. O CEP preenche boa parte do endereço."}
                        </p>
                    </div>
                </div>
            </div>

            <form
                aria-busy={isSubmitting}
                className="grid grid-cols-1 gap-5 p-5 sm:grid-cols-2 sm:p-6"
                onSubmit={(event) => void handleSubmit(event)}
                ref={formRef}
            >
                <div className="space-y-2 sm:col-span-2">
                    <div className="flex items-center justify-between gap-4">
                        <label
                            className="text-sm font-bold text-slate-800"
                            htmlFor="checkout-address-zip-code"
                        >
                            CEP
                        </label>
                        {isCepLoading ? (
                            <span
                                aria-live="polite"
                                className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-600"
                            >
                                <span
                                    aria-hidden="true"
                                    className="material-symbols-outlined animate-spin text-base"
                                >
                                    progress_activity
                                </span>
                                Buscando endereço
                            </span>
                        ) : null}
                    </div>
                    <input
                        autoComplete="postal-code"
                        className="min-h-12 w-full rounded-lg border border-slate-300 bg-white px-4 py-3 font-semibold text-slate-900 outline-none placeholder:text-slate-500 focus:border-primary focus:ring-4 focus:ring-primary/15"
                        id="checkout-address-zip-code"
                        inputMode="numeric"
                        maxLength={9}
                        name="zipCode"
                        onChange={(event) => {
                            const formattedZipCode = formatCep(
                                event.currentTarget.value,
                            );
                            const cleanZipCode = onlyDigits(
                                formattedZipCode,
                                8,
                            );
                            setZipCode(formattedZipCode);

                            if (cleanZipCode.length === 8) {
                                void findAddress(cleanZipCode);
                            } else {
                                lastCepRequestRef.current = "";
                                setIsCepLoading(false);
                            }
                        }}
                        placeholder="00000-000"
                        required
                        type="text"
                        value={zipCode}
                    />
                </div>

                <AddressInput
                    autoComplete="address-line1"
                    defaultValue={address?.street ?? ""}
                    id="checkout-address-street"
                    label="Rua"
                    maxLength={30}
                    name="street"
                    placeholder="Rua das Oliveiras"
                    required
                    wide
                />
                <AddressInput
                    autoComplete="address-line2"
                    defaultValue={address?.number ?? ""}
                    id="checkout-address-number"
                    label="Número"
                    name="number"
                    placeholder="123"
                    required
                />
                <AddressInput
                    defaultValue={address?.complement ?? ""}
                    id="checkout-address-complement"
                    label="Complemento (opcional)"
                    name="complement"
                    placeholder="Apto, bloco ou referência"
                />
                <AddressInput
                    autoComplete="address-level3"
                    defaultValue={address?.neighborhood ?? ""}
                    id="checkout-address-neighborhood"
                    label="Bairro"
                    name="neighborhood"
                    placeholder="Centro"
                    required
                />
                <AddressInput
                    autoComplete="address-level2"
                    defaultValue={address?.city ?? ""}
                    id="checkout-address-city"
                    label="Cidade"
                    name="city"
                    placeholder="São Paulo"
                    required
                />
                <AddressInput
                    autoComplete="address-level1"
                    defaultValue={address?.state ?? ""}
                    id="checkout-address-state"
                    label="Estado"
                    maxLength={2}
                    minLength={2}
                    name="state"
                    onChange={(event) => {
                        event.currentTarget.value =
                            event.currentTarget.value.toUpperCase();
                    }}
                    placeholder="SP"
                    required
                />
                <AddressInput
                    autoComplete="country-name"
                    defaultValue={address?.country || "Brasil"}
                    id="checkout-address-country"
                    label="País"
                    name="country"
                    placeholder="Brasil"
                    required
                />

                <div className="border-t border-slate-100 pt-5 sm:col-span-2">
                    <button
                        className="inline-flex min-h-12 w-full items-center justify-center gap-2 rounded-lg bg-primary px-5 py-3 font-bold text-white shadow-md shadow-primary/20 hover:brightness-110 focus:outline-none focus:ring-4 focus:ring-primary/30 disabled:opacity-60 sm:w-auto"
                        disabled={isCepLoading || isSubmitting}
                        type="submit"
                    >
                        <span
                            aria-hidden="true"
                            className={`material-symbols-outlined text-xl ${isSubmitting ? "animate-spin" : ""}`}
                        >
                            {isSubmitting ? "progress_activity" : "save"}
                        </span>
                        {isSubmitting
                            ? "Salvando endereço..."
                            : "Salvar endereço e continuar"}
                    </button>
                </div>
            </form>
        </section>
    );
}
