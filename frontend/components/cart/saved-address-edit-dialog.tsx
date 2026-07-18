"use client";

import { type ComponentProps, type FormEvent, useRef, useState } from "react";
import { toast } from "sonner";
import {
    fetchViaCepAddress,
    formatCep,
    onlyDigits,
} from "@/components/profile/profile-page-helpers";
import {
    Dialog,
    DialogClose,
    DialogContent,
    DialogDescription,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
} from "@/components/ui/dialog";
import { useProfile } from "@/hooks/use-profile";
import type { Address } from "@/lib/types";

type SavedAddressEditDialogProps = {
    address: Address;
    onSaved: () => void;
};

function AddressDialogInput({
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
            <label
                className="px-1 text-xs font-bold text-slate-700"
                htmlFor={id}
            >
                {label}
            </label>
            <input
                className="w-full rounded-lg border border-slate-200 bg-white px-4 py-3 font-medium text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-primary focus:ring-4 focus:ring-primary/15"
                id={id}
                type="text"
                {...inputProps}
            />
        </div>
    );
}

export function SavedAddressEditDialog({
    address,
    onSaved,
}: SavedAddressEditDialogProps) {
    const profile = useProfile();
    const [isOpen, setIsOpen] = useState(false);
    const [isCepLoading, setIsCepLoading] = useState(false);
    const [cepError, setCepError] = useState<string | null>(null);
    const [hasSubmitAttempted, setHasSubmitAttempted] = useState(false);
    const lastCepRequestRef = useRef("");
    const formRef = useRef<HTMLFormElement | null>(null);

    function setAddressField(name: string, value: string) {
        const field = formRef.current?.elements.namedItem(name);

        if (field instanceof HTMLInputElement) {
            field.value = value;
        }
    }

    async function handleZipCodeChange(value: string) {
        const cleanZipCode = onlyDigits(value, 8);
        setCepError(null);

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

            setAddressField("street", payload.logradouro ?? "");
            setAddressField("neighborhood", payload.bairro ?? "");
            setAddressField("city", payload.localidade ?? "");
            setAddressField("state", payload.uf ?? "");
            setAddressField("country", "Brasil");
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

    async function handleSubmit(event: FormEvent<HTMLFormElement>) {
        event.preventDefault();

        if (isCepLoading || profile.isSubmitting) {
            return;
        }

        setHasSubmitAttempted(true);
        const formData = new FormData(event.currentTarget);
        const getField = (name: string) =>
            String(formData.get(name) ?? "").trim();
        const updatedUser = await profile.updateProfile({
            address: {
                uuid: address.uuid,
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

        if (!updatedUser) {
            return;
        }

        onSaved();
        setIsOpen(false);
        toast.success("Endereço atualizado com sucesso.");
    }

    return (
        <Dialog
            onOpenChange={(open) => {
                setIsOpen(open);

                if (!open) {
                    lastCepRequestRef.current = "";
                    setIsCepLoading(false);
                    setCepError(null);
                    setHasSubmitAttempted(false);
                }
            }}
            open={isOpen}
        >
            <DialogTrigger asChild>
                <button
                    className="mt-3 inline-flex min-h-11 items-center gap-2 rounded-lg border border-primary/20 bg-primary/5 px-3 py-2 text-sm font-bold text-primary transition hover:bg-primary/10 focus:outline-none focus:ring-4 focus:ring-primary/20"
                    type="button"
                >
                    <span
                        aria-hidden="true"
                        className="material-symbols-outlined text-lg"
                    >
                        edit_square
                    </span>
                    Modificar endereço
                </button>
            </DialogTrigger>

            <DialogContent className="flex max-h-[calc(100dvh-2rem)] max-w-2xl flex-col overflow-hidden">
                <DialogClose
                    aria-label="Fechar edição do endereço"
                    className="absolute right-5 top-5 z-10 inline-flex h-10 w-10 items-center justify-center rounded-full border border-primary/10 bg-white text-slate-500 shadow-sm transition hover:text-slate-900 focus:outline-none focus:ring-4 focus:ring-primary/20"
                >
                    <span
                        aria-hidden="true"
                        className="material-symbols-outlined text-xl"
                    >
                        close
                    </span>
                </DialogClose>

                <div className="shrink-0 border-b border-[#d1a054]/20 bg-white/70 px-6 py-6 pr-16 sm:px-8">
                    <div className="flex items-start gap-4">
                        <span
                            aria-hidden="true"
                            className="material-symbols-outlined flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary"
                        >
                            home_pin
                        </span>
                        <DialogHeader className="gap-2">
                            <DialogTitle className="font-display text-2xl font-bold text-slate-900">
                                Modificar endereço de entrega
                            </DialogTitle>
                            <DialogDescription className="max-w-xl text-sm leading-6 text-slate-600">
                                Confira os dados abaixo. Todos os campos, exceto
                                o complemento, são obrigatórios.
                            </DialogDescription>
                        </DialogHeader>
                    </div>
                </div>

                <form
                    aria-busy={profile.isSubmitting}
                    className="flex min-h-0 flex-1 flex-col"
                    onSubmit={(event) => {
                        void handleSubmit(event);
                    }}
                    ref={formRef}
                >
                    <div className="grid min-h-0 flex-1 grid-cols-1 gap-5 overflow-y-auto px-6 py-6 sm:grid-cols-2 sm:px-8">
                        <div className="space-y-2 sm:col-span-2">
                            <div className="flex items-center justify-between gap-4 px-1">
                                <label
                                    className="text-xs font-bold text-slate-700"
                                    htmlFor="edit-shipping-zip-code"
                                >
                                    CEP
                                </label>
                                {isCepLoading ? (
                                    <span
                                        aria-live="polite"
                                        className="text-xs font-semibold text-slate-500"
                                    >
                                        Buscando endereço...
                                    </span>
                                ) : null}
                            </div>
                            <input
                                aria-describedby={
                                    cepError
                                        ? "edit-shipping-zip-error"
                                        : undefined
                                }
                                aria-invalid={Boolean(cepError)}
                                autoComplete="postal-code"
                                className="w-full rounded-lg border border-slate-200 bg-white px-4 py-3 font-medium text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-primary focus:ring-4 focus:ring-primary/15"
                                defaultValue={formatCep(address.zipCode)}
                                id="edit-shipping-zip-code"
                                inputMode="numeric"
                                maxLength={9}
                                name="zipCode"
                                onChange={(event) => {
                                    event.currentTarget.value = formatCep(
                                        event.currentTarget.value,
                                    );
                                    void handleZipCodeChange(
                                        event.currentTarget.value,
                                    );
                                }}
                                placeholder="01001-000"
                                required
                                type="text"
                            />
                            {cepError ? (
                                <p
                                    className="px-1 text-sm font-semibold text-red-700"
                                    id="edit-shipping-zip-error"
                                    role="alert"
                                >
                                    {cepError}
                                </p>
                            ) : null}
                        </div>

                        <AddressDialogInput
                            autoComplete="address-line1"
                            defaultValue={address.street}
                            id="edit-shipping-street"
                            label="Rua"
                            name="street"
                            placeholder="Rua das Oliveiras"
                            required
                            wide
                        />
                        <AddressDialogInput
                            autoComplete="address-line2"
                            defaultValue={address.number}
                            id="edit-shipping-number"
                            label="Número"
                            name="number"
                            placeholder="123"
                            required
                        />
                        <AddressDialogInput
                            defaultValue={address.complement ?? ""}
                            id="edit-shipping-complement"
                            label="Complemento (opcional)"
                            name="complement"
                            placeholder="Apto, bloco ou referência"
                        />
                        <AddressDialogInput
                            autoComplete="address-level3"
                            defaultValue={address.neighborhood}
                            id="edit-shipping-neighborhood"
                            label="Bairro"
                            name="neighborhood"
                            placeholder="Centro"
                            required
                        />
                        <AddressDialogInput
                            autoComplete="address-level2"
                            defaultValue={address.city}
                            id="edit-shipping-city"
                            label="Cidade"
                            name="city"
                            placeholder="São Paulo"
                            required
                        />
                        <AddressDialogInput
                            autoComplete="address-level1"
                            defaultValue={address.state}
                            id="edit-shipping-state"
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
                        <AddressDialogInput
                            autoComplete="country-name"
                            defaultValue={address.country || "Brasil"}
                            id="edit-shipping-country"
                            label="País"
                            name="country"
                            placeholder="Brasil"
                            required
                        />

                        {hasSubmitAttempted && profile.error ? (
                            <p
                                className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm font-semibold text-red-800 sm:col-span-2"
                                role="alert"
                            >
                                {profile.error}
                            </p>
                        ) : null}
                    </div>

                    <div className="flex shrink-0 flex-col-reverse gap-3 border-t border-[#d1a054]/20 bg-white/70 px-6 py-5 sm:flex-row sm:justify-end sm:px-8">
                        <DialogClose asChild>
                            <button
                                className="min-h-11 rounded-lg border border-slate-200 bg-white px-5 py-3 text-sm font-bold text-slate-700 transition hover:bg-slate-50 focus:outline-none focus:ring-4 focus:ring-primary/15 disabled:cursor-not-allowed disabled:opacity-50"
                                disabled={profile.isSubmitting}
                                type="button"
                            >
                                Cancelar
                            </button>
                        </DialogClose>
                        <button
                            className="inline-flex min-h-11 items-center justify-center gap-2 rounded-lg bg-primary px-5 py-3 text-sm font-bold text-white shadow-md shadow-primary/20 transition hover:brightness-110 focus:outline-none focus:ring-4 focus:ring-primary/30 disabled:cursor-not-allowed disabled:opacity-50"
                            disabled={profile.isSubmitting || isCepLoading}
                            type="submit"
                        >
                            <span
                                aria-hidden="true"
                                className="material-symbols-outlined text-xl"
                            >
                                {profile.isSubmitting
                                    ? "progress_activity"
                                    : "save"}
                            </span>
                            {profile.isSubmitting
                                ? "Salvando endereço..."
                                : "Salvar endereço"}
                        </button>
                    </div>
                </form>
            </DialogContent>
        </Dialog>
    );
}
