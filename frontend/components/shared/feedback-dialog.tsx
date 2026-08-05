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
    description: string;
    open: boolean;
    title: string;
    onOpenChange: (open: boolean) => void;
};

export function FeedbackDialog({
    description,
    open,
    title,
    onOpenChange,
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
                <DialogClose asChild>
                    <button
                        className="mt-6 min-h-11 w-full rounded-lg bg-primary px-4 py-3 font-bold text-white transition hover:bg-primary/90"
                        type="button"
                    >
                        Entendi
                    </button>
                </DialogClose>
            </DialogContent>
        </Dialog>
    );
}
