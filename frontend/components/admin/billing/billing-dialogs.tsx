import {
    Dialog,
    DialogClose,
    DialogContent,
    DialogDescription,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog";
import type { PaymentLink } from "@/lib/types";
import { formatCurrency } from "@/lib/utils";
import { formatDateTime, getPublicPaymentUrl } from "./utils";

export type BillingError = { title: string; description: string };

export type BillingReview = {
    amountInCents: number;
    description: string;
    expiresAt: string | null;
    isUnusual: boolean;
};

export function BillingReviewDialog({
    isSubmitting,
    onConfirm,
    onOpenChange,
    review,
}: {
    isSubmitting: boolean;
    onConfirm: () => void;
    onOpenChange: (open: boolean) => void;
    review: BillingReview | null;
}) {
    return (
        <Dialog open={review != null} onOpenChange={onOpenChange}>
            <DialogContent className="max-w-lg rounded-xl bg-white p-6">
                <DialogHeader>
                    <DialogTitle className="font-display text-2xl font-bold text-slate-950">
                        Revisar cobrança
                    </DialogTitle>
                    <DialogDescription className="text-sm leading-6 text-slate-600">
                        Confira os dados antes de criar o link. A emissão não
                        poderá ser desfeita por esta tela.
                    </DialogDescription>
                </DialogHeader>
                {review ? (
                    <dl className="mt-5 space-y-3 rounded-xl bg-slate-50 p-4 text-sm">
                        <div className="flex justify-between gap-4">
                            <dt className="text-slate-500">Valor</dt>
                            <dd className="font-bold text-slate-950">
                                {formatCurrency(review.amountInCents)}
                            </dd>
                        </div>
                        <div>
                            <dt className="text-slate-500">Descrição</dt>
                            <dd className="mt-1 [overflow-wrap:anywhere] font-semibold text-slate-950">
                                {review.description}
                            </dd>
                        </div>
                        <div className="flex justify-between gap-4">
                            <dt className="text-slate-500">Validade</dt>
                            <dd className="text-right font-semibold text-slate-950">
                                {review.expiresAt
                                    ? formatDateTime(review.expiresAt)
                                    : "Sem expiração"}
                            </dd>
                        </div>
                    </dl>
                ) : null}
                {review?.isUnusual ? (
                    <p className="mt-4 rounded-lg bg-amber-50 p-3 text-sm leading-6 text-amber-900">
                        Este valor está fora da faixa das cobranças recentes.
                        Isso pode ser correto, mas vale conferir antes de
                        emitir.
                    </p>
                ) : null}
                <div className="mt-6 flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
                    <DialogClose asChild>
                        <button
                            className="min-h-11 rounded-lg border border-slate-300 bg-white px-5 py-2.5 font-bold text-slate-700"
                            disabled={isSubmitting}
                            type="button"
                        >
                            Voltar e corrigir
                        </button>
                    </DialogClose>
                    <button
                        className="min-h-11 rounded-lg bg-primary px-5 py-2.5 font-bold text-white disabled:cursor-not-allowed disabled:opacity-60"
                        disabled={isSubmitting}
                        onClick={onConfirm}
                        type="button"
                    >
                        {isSubmitting ? "Criando cobrança..." : "Criar cobrança"}
                    </button>
                </div>
            </DialogContent>
        </Dialog>
    );
}

type GeneratedLinkDialogProps = {
    paymentLink: PaymentLink | null;
    isCopied: boolean;
    onCopy: () => void;
    onOpenChange: (open: boolean) => void;
};

export function GeneratedLinkDialog({
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
                            <div className="mt-3 border-b border-slate-200 pb-3 text-sm">
                                <span className="text-slate-500">Descrição</span>
                                <p className="mt-1 [overflow-wrap:anywhere] font-semibold text-slate-950">
                                    {paymentLink.description}
                                </p>
                            </div>
                            <div className="mt-3 flex items-center justify-between gap-4 text-sm">
                                <span className="text-slate-500">Validade</span>
                                <span className="text-right font-semibold text-slate-950">
                                    {paymentLink.expiresAt
                                        ? formatDateTime(paymentLink.expiresAt)
                                        : "Sem expiração"}
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

export function BillingErrorDialog({
    error,
    onClose,
}: {
    error: BillingError | null;
    onClose: () => void;
}) {
    return (
        <Dialog
            open={error != null}
            onOpenChange={(open) => !open && onClose()}
        >
            <DialogContent className="max-w-md rounded-xl bg-white p-6">
                <DialogHeader>
                    <DialogTitle className="font-display text-2xl font-bold text-slate-950">
                        {error?.title}
                    </DialogTitle>
                    <DialogDescription className="text-sm leading-6 text-slate-600">
                        {error?.description}
                    </DialogDescription>
                </DialogHeader>
                <div className="mt-6 flex justify-end">
                    <button
                        className="rounded-lg bg-primary px-4 py-2 font-bold text-white"
                        onClick={onClose}
                        type="button"
                    >
                        Entendi
                    </button>
                </div>
            </DialogContent>
        </Dialog>
    );
}
