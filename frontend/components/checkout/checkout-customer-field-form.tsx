"use client";

import { type FormEvent, useState } from "react";
import {
    formatCpf,
    formatPhone,
    onlyDigits,
} from "@/components/profile/profile-page-helpers";
import { useApiToken } from "@/hooks/use-api-token";
import { useUser } from "@/hooks/use-user";
import { updateCurrentUser } from "@/lib/api";

type CheckoutCustomerFieldFormProps = {
    field: "document" | "phone";
    onError: (title: string, description: string) => void;
    onSaved: (title: string, description: string) => void;
};

const fieldConfig = {
    document: {
        autoComplete: "off",
        description:
            "O CPF é obrigatório para emitir seu pedido. Cadastre sem sair desta página.",
        errorDescription: "Digite um CPF com 11 números.",
        errorTitle: "Confira o CPF",
        format: formatCpf,
        icon: "badge",
        inputMode: "numeric" as const,
        label: "CPF",
        maxDigits: 11,
        maxLength: 14,
        placeholder: "123.456.789-00",
        savedDescription:
            "Seu CPF foi cadastrado. Você já pode continuar a confirmação do pedido.",
        savedTitle: "CPF salvo",
        submitLabel: "Salvar CPF e continuar",
        submittingLabel: "Salvando CPF...",
        title: "Cadastre seu CPF",
        type: "text" as const,
    },
    phone: {
        autoComplete: "tel",
        description:
            "Esta transportadora precisa de um telefone com DDD para realizar a entrega.",
        errorDescription: "Digite um telefone celular com DDD e 11 números.",
        errorTitle: "Confira o telefone",
        format: formatPhone,
        icon: "phone_in_talk",
        inputMode: "tel" as const,
        label: "Telefone com DDD",
        maxDigits: 11,
        maxLength: 15,
        placeholder: "(11) 98765-4321",
        savedDescription:
            "Seu telefone foi cadastrado. Você já pode continuar a confirmação do pedido.",
        savedTitle: "Telefone salvo",
        submitLabel: "Salvar telefone e continuar",
        submittingLabel: "Salvando telefone...",
        title: "Cadastre seu telefone",
        type: "tel" as const,
    },
};

export function CheckoutCustomerFieldForm({
    field,
    onError,
    onSaved,
}: CheckoutCustomerFieldFormProps) {
    const token = useApiToken();
    const userContext = useUser();
    const config = fieldConfig[field];
    const [isSubmitting, setIsSubmitting] = useState(false);

    async function handleSubmit(event: FormEvent<HTMLFormElement>) {
        event.preventDefault();

        if (!token || isSubmitting) return;

        const formData = new FormData(event.currentTarget);
        const value = onlyDigits(
            String(formData.get(field) ?? ""),
            config.maxDigits,
        );

        if (value.length !== config.maxDigits) {
            onError(config.errorTitle, config.errorDescription);
            return;
        }

        setIsSubmitting(true);

        try {
            const response = await updateCurrentUser(
                token,
                field === "document" ? { document: value } : { phone: value },
            );
            userContext.setUser(response.user);
            onSaved(config.savedTitle, config.savedDescription);
        } catch (error) {
            onError(
                `Não foi possível salvar ${field === "document" ? "o CPF" : "o telefone"}`,
                error instanceof Error
                    ? error.message
                    : "Confira o dado e tente novamente.",
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
                        {config.icon}
                    </span>
                    <div className="min-w-0">
                        <h2 className="font-display text-xl font-bold text-slate-950">
                            {config.title}
                        </h2>
                        <p className="mt-1 max-w-2xl text-sm leading-6 text-slate-600">
                            {config.description}
                        </p>
                    </div>
                </div>
            </div>

            <form
                aria-busy={isSubmitting}
                className="p-5 sm:p-6"
                noValidate
                onSubmit={(event) => void handleSubmit(event)}
            >
                <div className="max-w-md space-y-2">
                    <label
                        className="text-sm font-bold text-slate-800"
                        htmlFor={`checkout-${field}`}
                    >
                        {config.label}
                    </label>
                    <input
                        autoComplete={config.autoComplete}
                        className="min-h-12 w-full rounded-lg border border-slate-300 bg-white px-4 py-3 text-base font-semibold text-slate-900 outline-none placeholder:text-slate-500 focus:border-primary focus:ring-4 focus:ring-primary/15"
                        id={`checkout-${field}`}
                        inputMode={config.inputMode}
                        maxLength={config.maxLength}
                        name={field}
                        onChange={(event) => {
                            event.currentTarget.value = config.format(
                                event.currentTarget.value,
                            );
                        }}
                        placeholder={config.placeholder}
                        type={config.type}
                    />
                </div>

                <div className="mt-5 border-t border-slate-100 pt-5">
                    <button
                        className="inline-flex min-h-12 w-full items-center justify-center gap-2 rounded-lg bg-primary px-5 py-3 font-bold text-white shadow-md shadow-primary/20 hover:brightness-110 focus:outline-none focus:ring-4 focus:ring-primary/30 disabled:opacity-60 sm:w-auto"
                        disabled={isSubmitting}
                        type="submit"
                    >
                        <span
                            aria-hidden="true"
                            className={`material-symbols-outlined text-xl ${isSubmitting ? "animate-spin" : ""}`}
                        >
                            {isSubmitting ? "progress_activity" : "save"}
                        </span>
                        {isSubmitting
                            ? config.submittingLabel
                            : config.submitLabel}
                    </button>
                </div>
            </form>
        </section>
    );
}
