import Link from "next/link";
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog";
import { Skeleton } from "@/components/ui/skeleton";

export type CheckoutError = { title: string; description: string };

export function CheckoutLoading() {
    return (
        <main
            aria-busy="true"
            aria-label="Carregando finalização da compra"
            className="min-h-[70vh] bg-[#f6f6f8] px-4 py-10 sm:px-6 md:px-10 md:py-12"
        >
            <div className="mx-auto max-w-6xl space-y-5">
                <Skeleton className="h-12 w-72" />
                <Skeleton className="h-24 w-full rounded-xl bg-white" />
                <Skeleton className="h-80 w-full rounded-xl bg-white" />
            </div>
        </main>
    );
}

export function EmptyCheckout() {
    return (
        <section className="mt-8 rounded-xl border border-dashed border-slate-300 bg-white px-6 py-12 text-center">
            <h2 className="font-display text-2xl font-bold text-slate-950">
                Não há uma compra para finalizar
            </h2>
            <p className="mt-2 text-sm text-slate-600">
                Escolha os produtos e a entrega no carrinho primeiro.
            </p>
            <Link
                className="mt-6 inline-flex rounded-lg bg-primary px-5 py-3 font-bold text-white focus:outline-none focus:ring-4 focus:ring-primary/30"
                href="/carrinho"
            >
                Voltar ao carrinho
            </Link>
        </section>
    );
}

export function CheckoutErrorDialog({
    error,
    onClose,
}: {
    error: CheckoutError | null;
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
