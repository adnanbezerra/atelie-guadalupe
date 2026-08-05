"use client";

import { FormEvent, useCallback, useEffect, useMemo, useState } from "react";
import { BillingForm } from "./billing/billing-form";
import { BillingPreview } from "./billing/billing-preview";
import {
    BillingError,
    BillingErrorDialog,
    GeneratedLinkDialog,
} from "./billing/billing-dialogs";
import { RecentPaymentLinks } from "./billing/recent-payment-links";
import {
    copyText,
    getPublicPaymentUrl,
    parseAmountInCents,
    RECENT_LINKS_LIMIT,
} from "./billing/utils";
import { useApiToken } from "@/hooks/use-api-token";
import { createPaymentLink, getPaymentLinks } from "@/lib/api";
import type { PaymentLink } from "@/lib/types";

type AdminBillingClientProps = {
    initialPaymentLinks: PaymentLink[];
};

export function AdminBillingClient({
    initialPaymentLinks,
}: AdminBillingClientProps) {
    const token = useApiToken();
    const [amount, setAmount] = useState("");
    const [description, setDescription] = useState("");
    const [expiresAt, setExpiresAt] = useState("");
    const [paymentLinks, setPaymentLinks] =
        useState<PaymentLink[]>(initialPaymentLinks);
    const [generatedPaymentLink, setGeneratedPaymentLink] =
        useState<PaymentLink | null>(null);
    const [isLoading, setIsLoading] = useState(
        initialPaymentLinks.length === 0,
    );
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [isCopied, setIsCopied] = useState(false);
    const [billingError, setBillingError] = useState<BillingError | null>(null);

    const amountInCents = useMemo(() => parseAmountInCents(amount), [amount]);
    const previewDescription =
        description.trim() || "Descrição da cobrança personalizada";

    const loadPaymentLinks = useCallback(
        async (showErrors = true) => {
            if (!token) return;

            setIsLoading(true);

            try {
                const payload = await getPaymentLinks(token, {
                    page: 1,
                    pageSize: RECENT_LINKS_LIMIT,
                });
                setPaymentLinks(payload.items);
            } catch (error) {
                if (showErrors) {
                    setBillingError({
                        title: "Não foi possível carregar as cobranças",
                        description:
                            error instanceof Error
                                ? error.message
                                : "Tente atualizar a lista em instantes.",
                    });
                }
            } finally {
                setIsLoading(false);
            }
        },
        [token],
    );

    useEffect(() => {
        void loadPaymentLinks();
    }, [loadPaymentLinks]);

    async function handleSubmit(event: FormEvent<HTMLFormElement>) {
        event.preventDefault();

        const normalizedDescription = description.trim();
        const expiration = expiresAt ? new Date(expiresAt) : null;

        if (amountInCents <= 0) {
            setBillingError({
                title: "Confira o valor",
                description: "Informe um valor maior que zero para a cobrança.",
            });
            return;
        }

        if (!normalizedDescription || normalizedDescription.length > 500) {
            setBillingError({
                title: "Confira a descrição",
                description: "Escreva uma descrição entre 1 e 500 caracteres.",
            });
            return;
        }

        if (
            expiration &&
            (!Number.isFinite(expiration.getTime()) ||
                expiration.getTime() <= Date.now())
        ) {
            setBillingError({
                title: "Confira a expiração",
                description:
                    "Escolha uma data e hora futuras ou deixe o campo vazio.",
            });
            return;
        }

        if (!token) {
            setBillingError({
                title: "Sessão encerrada",
                description: "Entre novamente para gerar uma cobrança.",
            });
            return;
        }

        setIsSubmitting(true);

        try {
            const payload = await createPaymentLink(token, {
                amountInCents,
                description: normalizedDescription,
                ...(expiration ? { expiresAt: expiration.toISOString() } : {}),
            });

            setPaymentLinks((current) =>
                [
                    payload.paymentLink,
                    ...current.filter(
                        (item) => item.uuid !== payload.paymentLink.uuid,
                    ),
                ].slice(0, RECENT_LINKS_LIMIT),
            );
            setGeneratedPaymentLink(payload.paymentLink);
            setIsCopied(false);
            setAmount("");
            setDescription("");
            setExpiresAt("");
        } catch (error) {
            setBillingError({
                title: "Não foi possível gerar o link",
                description:
                    error instanceof Error
                        ? error.message
                        : "A cobrança não foi criada. Tente novamente.",
            });
        } finally {
            setIsSubmitting(false);
        }
    }

    async function handleCopy() {
        if (!generatedPaymentLink) return;

        try {
            await copyText(getPublicPaymentUrl(generatedPaymentLink));
            setIsCopied(true);
        } catch (error) {
            setBillingError({
                title: "Não foi possível copiar",
                description:
                    error instanceof Error
                        ? error.message
                        : "Selecione o link e copie manualmente.",
            });
        }
    }

    return (
        <div className="min-h-full bg-[#f6f6f8]">
            <div className="mx-auto w-full max-w-7xl px-5 py-8 md:px-8 md:py-10">
                <header className="max-w-3xl">
                    <p className="font-public text-xs font-bold uppercase tracking-[0.16em] text-primary">
                        Cobranças avulsas
                    </p>
                    <h1 className="mt-2 font-display text-3xl font-bold text-slate-950 md:text-4xl">
                        Gerar link de pagamento
                    </h1>
                    <p className="mt-3 text-sm leading-6 text-slate-600 md:text-base">
                        Crie uma cobrança com valor e descrição próprios para
                        enviar diretamente ao cliente.
                    </p>
                </header>

                <div className="mt-8 grid gap-6 lg:grid-cols-[minmax(0,1.45fr)_minmax(19rem,0.55fr)]">
                    <BillingForm
                        amount={amount}
                        description={description}
                        expiresAt={expiresAt}
                        isSubmitting={isSubmitting}
                        onAmountChange={setAmount}
                        onDescriptionChange={setDescription}
                        onExpirationChange={setExpiresAt}
                        onSubmit={handleSubmit}
                    />
                    <BillingPreview
                        amountInCents={amountInCents}
                        description={previewDescription}
                        expiresAt={expiresAt}
                    />
                </div>

                <RecentPaymentLinks
                    isLoading={isLoading}
                    onRefresh={() => void loadPaymentLinks()}
                    paymentLinks={paymentLinks}
                />
            </div>

            <GeneratedLinkDialog
                isCopied={isCopied}
                onCopy={handleCopy}
                onOpenChange={(open) => {
                    if (!open) {
                        setGeneratedPaymentLink(null);
                        setIsCopied(false);
                    }
                }}
                paymentLink={generatedPaymentLink}
            />
            <BillingErrorDialog
                error={billingError}
                onClose={() => setBillingError(null)}
            />
        </div>
    );
}
