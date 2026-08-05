"use client";

import { FormEvent, useCallback, useEffect, useMemo, useState } from "react";
import {
    Dialog,
    DialogClose,
    DialogContent,
    DialogDescription,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog";
import { Skeleton } from "@/components/ui/skeleton";
import { useApiToken } from "@/hooks/use-api-token";
import { createPaymentLink, getPaymentLinks } from "@/lib/api";
import type { PaymentLink, PaymentLinkStatus } from "@/lib/types";
import { formatCurrency } from "@/lib/utils";

type AdminBillingClientProps = {
    initialPaymentLinks: PaymentLink[];
};

type BillingError = {
    title: string;
    description: string;
};

const RECENT_LINKS_LIMIT = 8;

const statusDetails: Record<
    PaymentLinkStatus,
    { label: string; detail: string; tone: string }
> = {
    ACTIVE: {
        label: "Não pago",
        detail: "Link ativo",
        tone: "bg-amber-50 text-amber-800 ring-amber-200",
    },
    CREATING: {
        label: "Não pago",
        detail: "Criando checkout",
        tone: "bg-blue-50 text-blue-800 ring-blue-200",
    },
    PENDING: {
        label: "Não pago",
        detail: "Aguardando pagamento",
        tone: "bg-blue-50 text-blue-800 ring-blue-200",
    },
    PAID: {
        label: "Pago",
        detail: "Pagamento confirmado",
        tone: "bg-emerald-50 text-emerald-800 ring-emerald-200",
    },
    EXPIRED: {
        label: "Não pago",
        detail: "Link expirado",
        tone: "bg-slate-100 text-slate-700 ring-slate-200",
    },
    REFUNDED: {
        label: "Reembolsado",
        detail: "Valor devolvido",
        tone: "bg-slate-100 text-slate-700 ring-slate-200",
    },
    DISPUTED: {
        label: "Em disputa",
        detail: "Requer atenção",
        tone: "bg-red-50 text-red-800 ring-red-200",
    },
    LOST: {
        label: "Disputa perdida",
        detail: "Cobrança encerrada",
        tone: "bg-red-50 text-red-800 ring-red-200",
    },
};

function parseAmountInCents(value: string) {
    const amount = Number(value.replace(",", "."));
    return Number.isFinite(amount) ? Math.round(amount * 100) : 0;
}

function formatDateTime(value: string) {
    return new Intl.DateTimeFormat("pt-BR", {
        day: "2-digit",
        month: "short",
        year: "numeric",
        hour: "2-digit",
        minute: "2-digit",
    }).format(new Date(value));
}

function getPublicPaymentUrl(paymentLink: PaymentLink) {
    if (paymentLink.paymentUrl) return paymentLink.paymentUrl;
    return `${window.location.origin}/checkout/manual/${paymentLink.uuid}`;
}

async function copyText(value: string) {
    try {
        await navigator.clipboard.writeText(value);
    } catch {
        const textarea = document.createElement("textarea");
        textarea.value = value;
        textarea.style.position = "fixed";
        textarea.style.opacity = "0";
        document.body.appendChild(textarea);
        textarea.select();
        const copied = document.execCommand("copy");
        textarea.remove();

        if (!copied) throw new Error("Não foi possível copiar o link.");
    }
}

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
                                    O cliente verá a descrição e o valor antes
                                    de pagar.
                                </p>
                            </div>
                        </div>

                        <form
                            className="mt-6 space-y-5"
                            noValidate
                            onSubmit={handleSubmit}
                        >
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
                                        setDescription(
                                            event.currentTarget.value,
                                        )
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
                                                setAmount(
                                                    event.currentTarget.value,
                                                )
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
                                            setExpiresAt(
                                                event.currentTarget.value,
                                            )
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
                                        Este link não reserva estoque nem cria
                                        pedido ou frete. Ele serve apenas para
                                        uma cobrança avulsa.
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

                    <aside className="h-fit overflow-hidden rounded-xl border border-[#d1a054]/35 bg-[#f8f5ef] shadow-sm lg:sticky lg:top-6">
                        <div className="border-b border-dashed border-[#d1a054]/40 px-6 py-5">
                            <p className="font-public text-[0.68rem] font-bold uppercase tracking-[0.18em] text-[#4A3728]">
                                Nota de cobrança
                            </p>
                            <p className="mt-1 text-xs text-slate-500">
                                Prévia antes de emitir
                            </p>
                        </div>
                        <div className="px-6 py-7">
                            <p className="text-sm font-semibold leading-6 text-slate-800">
                                {previewDescription}
                            </p>
                            <p className="mt-7 font-display text-4xl font-bold tracking-tight text-primary">
                                {amountInCents > 0
                                    ? formatCurrency(amountInCents)
                                    : "R$ 0,00"}
                            </p>
                            <dl className="mt-7 space-y-3 border-t border-dashed border-[#d1a054]/40 pt-5 text-sm">
                                <div className="flex justify-between gap-4">
                                    <dt className="text-slate-500">Validade</dt>
                                    <dd className="text-right font-semibold text-slate-800">
                                        {expiresAt
                                            ? formatDateTime(
                                                  new Date(
                                                      expiresAt,
                                                  ).toISOString(),
                                              )
                                            : "Sem expiração"}
                                    </dd>
                                </div>
                                <div className="flex justify-between gap-4">
                                    <dt className="text-slate-500">
                                        Situação inicial
                                    </dt>
                                    <dd className="font-semibold text-amber-800">
                                        Não pago
                                    </dd>
                                </div>
                            </dl>
                        </div>
                    </aside>
                </div>

                <section className="mt-8 overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
                    <div className="flex flex-col gap-3 border-b border-slate-200 px-5 py-5 sm:flex-row sm:items-center sm:justify-between md:px-7">
                        <div>
                            <h2 className="text-xl font-bold text-slate-950">
                                Cobranças recentes
                            </h2>
                            <p className="mt-1 text-sm text-slate-500">
                                Somente links de pagamento personalizados, do
                                mais recente para o mais antigo.
                            </p>
                        </div>
                        <button
                            className="inline-flex min-h-10 items-center justify-center gap-2 self-start rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm font-bold text-slate-700 transition hover:bg-slate-50 focus:outline-none focus:ring-4 focus:ring-primary/15 disabled:opacity-60"
                            disabled={isLoading}
                            onClick={() => void loadPaymentLinks()}
                            type="button"
                        >
                            <span className="material-symbols-outlined text-lg">
                                refresh
                            </span>
                            Atualizar
                        </button>
                    </div>

                    {isLoading ? (
                        <div
                            className="space-y-3 p-5 md:p-7"
                            aria-label="Carregando cobranças"
                        >
                            {[0, 1, 2].map((item) => (
                                <Skeleton
                                    className="h-16 w-full rounded-lg"
                                    key={item}
                                />
                            ))}
                        </div>
                    ) : paymentLinks.length ? (
                        <div className="overflow-x-auto">
                            <table className="w-full min-w-[780px] text-left text-sm">
                                <thead className="bg-slate-50 font-public text-[0.68rem] font-bold uppercase tracking-[0.12em] text-slate-500">
                                    <tr>
                                        <th className="px-6 py-3">Cobrança</th>
                                        <th className="px-6 py-3">
                                            Criada por
                                        </th>
                                        <th className="px-6 py-3">Valor</th>
                                        <th className="px-6 py-3">Status</th>
                                        <th className="px-6 py-3">Data</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-100">
                                    {paymentLinks.map((paymentLink) => (
                                        <PaymentLinkRow
                                            key={paymentLink.uuid}
                                            paymentLink={paymentLink}
                                        />
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    ) : (
                        <div className="px-6 py-12 text-center">
                            <span className="material-symbols-outlined text-4xl text-slate-300">
                                receipt_long
                            </span>
                            <h3 className="mt-3 font-bold text-slate-900">
                                Nenhuma cobrança personalizada
                            </h3>
                            <p className="mt-1 text-sm text-slate-500">
                                O primeiro link gerado aparecerá aqui.
                            </p>
                        </div>
                    )}
                </section>
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

            <Dialog
                open={billingError != null}
                onOpenChange={(open) => !open && setBillingError(null)}
            >
                <DialogContent className="max-w-md rounded-xl bg-white p-6">
                    <DialogHeader>
                        <DialogTitle className="font-display text-2xl font-bold text-slate-950">
                            {billingError?.title}
                        </DialogTitle>
                        <DialogDescription className="text-sm leading-6 text-slate-600">
                            {billingError?.description}
                        </DialogDescription>
                    </DialogHeader>
                    <div className="mt-6 flex justify-end">
                        <button
                            className="rounded-lg bg-primary px-4 py-2 font-bold text-white"
                            onClick={() => setBillingError(null)}
                            type="button"
                        >
                            Entendi
                        </button>
                    </div>
                </DialogContent>
            </Dialog>
        </div>
    );
}

function PaymentLinkRow({ paymentLink }: { paymentLink: PaymentLink }) {
    const status = statusDetails[paymentLink.status];

    return (
        <tr className="text-slate-700">
            <td className="max-w-sm px-6 py-4">
                <p
                    className="truncate font-bold text-slate-950"
                    title={paymentLink.description}
                >
                    {paymentLink.description}
                </p>
                <p className="mt-1 font-mono text-[0.68rem] text-slate-400">
                    {paymentLink.uuid.slice(0, 8)}
                </p>
            </td>
            <td className="px-6 py-4">
                <p className="font-semibold text-slate-800">
                    {paymentLink.createdBy.name}
                </p>
                <p className="mt-1 text-xs text-slate-500">
                    {paymentLink.createdBy.email}
                </p>
            </td>
            <td className="px-6 py-4 font-bold text-slate-950">
                {formatCurrency(paymentLink.amountInCents)}
            </td>
            <td className="px-6 py-4">
                <span
                    className={`inline-flex rounded-full px-2.5 py-1 text-xs font-bold ring-1 ring-inset ${status.tone}`}
                >
                    {status.label}
                </span>
                <p className="mt-1.5 text-xs text-slate-500">{status.detail}</p>
            </td>
            <td className="whitespace-nowrap px-6 py-4 text-slate-600">
                {formatDateTime(paymentLink.createdAt)}
                {paymentLink.paidAt ? (
                    <p className="mt-1 text-xs font-semibold text-emerald-700">
                        Pago em {formatDateTime(paymentLink.paidAt)}
                    </p>
                ) : null}
            </td>
        </tr>
    );
}

type GeneratedLinkDialogProps = {
    paymentLink: PaymentLink | null;
    isCopied: boolean;
    onCopy: () => void;
    onOpenChange: (open: boolean) => void;
};

function GeneratedLinkDialog({
    paymentLink,
    isCopied,
    onCopy,
    onOpenChange,
}: GeneratedLinkDialogProps) {
    const paymentUrl = paymentLink ? getPublicPaymentUrl(paymentLink) : "";

    return (
        <Dialog open={paymentLink != null} onOpenChange={onOpenChange}>
            <DialogContent className="max-w-xl overflow-hidden rounded-xl bg-white p-0">
                <div className="bg-emerald-50 px-6 py-5 md:px-8">
                    <span className="material-symbols-outlined flex size-12 items-center justify-center rounded-full bg-white text-3xl text-[#167a45] shadow-sm">
                        check_circle
                    </span>
                </div>
                <div className="px-6 pb-7 pt-6 md:px-8">
                    <DialogHeader>
                        <DialogTitle className="font-display text-3xl font-bold text-slate-950">
                            Link gerado com sucesso
                        </DialogTitle>
                        <DialogDescription className="text-sm leading-6 text-slate-600">
                            A cobrança está pronta para ser enviada ao cliente.
                            Copie o endereço abaixo.
                        </DialogDescription>
                    </DialogHeader>

                    {paymentLink ? (
                        <div className="mt-6 rounded-xl border border-slate-200 bg-slate-50 p-4">
                            <div className="flex items-center justify-between gap-4 border-b border-slate-200 pb-3 text-sm">
                                <span className="text-slate-500">Valor</span>
                                <span className="font-bold text-slate-950">
                                    {formatCurrency(paymentLink.amountInCents)}
                                </span>
                            </div>
                            <label
                                className="mt-4 block font-public text-[0.68rem] font-bold uppercase tracking-[0.12em] text-slate-500"
                                htmlFor="generated-payment-link"
                            >
                                Link para compartilhar
                            </label>
                            <input
                                className="mt-2 h-12 w-full rounded-lg border border-slate-300 bg-white px-3 font-mono text-xs text-slate-700 outline-none focus:border-primary focus:ring-4 focus:ring-primary/15"
                                id="generated-payment-link"
                                onFocus={(event) =>
                                    event.currentTarget.select()
                                }
                                readOnly
                                value={paymentUrl}
                            />
                        </div>
                    ) : null}

                    <div className="mt-6 flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
                        <DialogClose asChild>
                            <button
                                className="min-h-11 rounded-lg border border-slate-300 bg-white px-5 py-2.5 font-bold text-slate-700"
                                type="button"
                            >
                                Fechar
                            </button>
                        </DialogClose>
                        <button
                            className="flex min-h-11 items-center justify-center gap-2 rounded-lg bg-primary px-5 py-2.5 font-bold text-white focus:outline-none focus:ring-4 focus:ring-primary/30"
                            onClick={onCopy}
                            type="button"
                        >
                            <span className="material-symbols-outlined text-lg">
                                {isCopied ? "check" : "content_copy"}
                            </span>
                            {isCopied ? "Link copiado" : "Copiar link"}
                        </button>
                    </div>
                </div>
            </DialogContent>
        </Dialog>
    );
}
