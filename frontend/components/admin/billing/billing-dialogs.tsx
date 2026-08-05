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
import { getPublicPaymentUrl } from "./utils";

export type BillingError = { title: string; description: string };

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
