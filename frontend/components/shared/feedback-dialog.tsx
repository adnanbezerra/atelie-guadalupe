"use client";

import {
    Dialog,
    DialogClose,
    DialogContent,
    DialogDescription,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog";

type FeedbackDialogProps = {
    confirmLabel?: string;
    description: string;
    open: boolean;
    secondaryLabel?: string;
    title: string;
    onConfirm?: () => void;
    onOpenChange: (open: boolean) => void;
    onSecondary?: () => void;
};

export function FeedbackDialog({
    confirmLabel = "Entendi",
    description,
    open,
    secondaryLabel,
    title,
    onConfirm,
    onOpenChange,
    onSecondary,
}: FeedbackDialogProps) {
    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent
                className="max-w-md rounded-xl bg-white p-6"
                role="alertdialog"
            >
                <DialogHeader>
                    <DialogTitle className="font-display text-2xl font-bold text-slate-950">
                        {title}
                    </DialogTitle>
                    <DialogDescription className="text-base leading-6 text-slate-600 [overflow-wrap:anywhere]">
                        {description}
                    </DialogDescription>
                </DialogHeader>
                <div className="mt-6 flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
                    {secondaryLabel ? (
                        <DialogClose asChild>
                            <button
                                className="min-h-11 rounded-lg border border-slate-200 bg-white px-4 py-3 font-bold text-slate-700 transition hover:bg-slate-50"
                                onClick={onSecondary}
                                type="button"
                            >
                                {secondaryLabel}
                            </button>
                        </DialogClose>
                    ) : null}
                    <DialogClose asChild>
                        <button
                            className="min-h-11 rounded-lg bg-primary px-4 py-3 font-bold text-white transition hover:bg-primary/90"
                            onClick={onConfirm}
                            type="button"
                        >
                            {confirmLabel}
                        </button>
                    </DialogClose>
                </div>
            </DialogContent>
        </Dialog>
    );
}
