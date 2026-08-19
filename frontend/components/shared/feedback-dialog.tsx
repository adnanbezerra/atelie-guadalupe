"use client";

import type { ReactNode } from "react";
import {
    Dialog,
    DialogClose,
    DialogContent,
    DialogDescription,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog";

type FeedbackDialogProps = {
    actions?: ReactNode;
    contentClassName?: string;
    description: ReactNode;
    open: boolean;
    title: string;
    visual?: ReactNode;
    onOpenChange: (open: boolean) => void;
};

export function FeedbackDialog({
    actions,
    contentClassName,
    description,
    open,
    title,
    visual,
    onOpenChange,
}: FeedbackDialogProps) {
    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent
                className={`max-w-md rounded-xl bg-white p-6 ${contentClassName ?? ""}`}
                role="alertdialog"
            >
                {visual}
                <DialogHeader>
                    <DialogTitle className="font-display text-2xl font-bold text-slate-950">
                        {title}
                    </DialogTitle>
                    <DialogDescription className="text-base leading-6 text-slate-600 [overflow-wrap:anywhere]">
                        {description}
                    </DialogDescription>
                </DialogHeader>
                {actions ? (
                    <div className="mt-6 grid gap-3">{actions}</div>
                ) : (
                    <DialogClose asChild>
                        <button
                            className="mt-6 min-h-11 w-full rounded-lg bg-primary px-4 py-3 font-bold text-white transition hover:bg-primary/90"
                            type="button"
                        >
                            Entendi
                        </button>
                    </DialogClose>
                )}
            </DialogContent>
        </Dialog>
    );
}
