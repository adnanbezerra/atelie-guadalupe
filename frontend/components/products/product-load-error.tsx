"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { FeedbackDialog } from "@/components/shared/feedback-dialog";

export function ProductLoadError() {
    const router = useRouter();
    const [isOpen, setIsOpen] = useState(true);

    return (
        <main className="flex min-h-[calc(100vh-83px)] items-center justify-center bg-[#f7f3ed] px-6 py-16">
            <button
                className="min-h-11 rounded-lg bg-primary px-5 py-3 font-bold text-white transition hover:bg-primary/90"
                onClick={() => setIsOpen(true)}
                type="button"
            >
                Tentar carregar novamente
            </button>
            <FeedbackDialog
                confirmLabel="Tentar novamente"
                description="Não foi possível carregar este produto. Confira sua conexão e tente novamente."
                onConfirm={() => router.refresh()}
                onOpenChange={setIsOpen}
                open={isOpen}
                title="Produto indisponível no momento"
            />
        </main>
    );
}
