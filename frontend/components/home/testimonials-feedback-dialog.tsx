"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { FeedbackDialog } from "@/components/shared/feedback-dialog";

type TestimonialsFeedbackDialogProps = {
    error: string | null;
};

export function TestimonialsFeedbackDialog({
    error,
}: TestimonialsFeedbackDialogProps) {
    const router = useRouter();
    const [open, setOpen] = useState(Boolean(error));

    if (!error) {
        return null;
    }

    return (
        <FeedbackDialog
            confirmLabel="Tentar novamente"
            description={`${error} Tente carregar os depoimentos novamente.`}
            onConfirm={() => router.refresh()}
            onOpenChange={setOpen}
            open={open}
            title="Não foi possível carregar os depoimentos"
        />
    );
}
