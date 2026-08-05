import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog";
import type { PriceOption, Product } from "@/lib/types";
import {
    applyProductDiscount,
    formatCurrency,
    formatProductSizeLabel,
    normalizeDiscountPercent,
} from "@/lib/utils";

type SizeSelectionDialogProps = {
    isPending: boolean;
    onAdd: (product: Product, option: PriceOption) => void;
    onClose: () => void;
    product: Product | null;
};

export function SizeSelectionDialog({
    isPending,
    onAdd,
    onClose,
    product,
}: SizeSelectionDialogProps) {
    const discountPercent = normalizeDiscountPercent(
        product?.promotionDiscountPercent,
    );
    const priceOptions = [...(product?.priceOptions ?? [])]
        .filter((option) => option.priceInCents > 0)
        .sort((a, b) => a.grams - b.grams);

    return (
        <Dialog
            onOpenChange={(open) => !open && onClose()}
            open={product != null}
        >
            <DialogContent className="max-w-md rounded-xl bg-white p-6">
                <DialogHeader>
                    <DialogTitle className="text-xl font-bold text-slate-900">
                        Escolha o tamanho
                    </DialogTitle>
                    <DialogDescription className="text-sm leading-6 text-slate-600">
                        {product?.name} tem valores por tamanho. Selecione uma
                        opção para adicionar ao carrinho.
                    </DialogDescription>
                </DialogHeader>
                <div className="mt-5 grid gap-3">
                    {priceOptions.map((option) => (
                        <button
                            className="group flex items-center justify-between rounded-xl border border-slate-200 bg-white p-4 text-left transition hover:border-primary hover:bg-primary/5 disabled:cursor-not-allowed disabled:opacity-60"
                            disabled={!product || isPending}
                            key={option.size}
                            onClick={() => product && onAdd(product, option)}
                            type="button"
                        >
                            <span>
                                <span className="block text-sm font-black uppercase tracking-widest text-slate-900">
                                    {formatProductSizeLabel(option.grams)}
                                </span>
                                <span className="mt-1 block text-xs text-slate-500">
                                    Tamanho escolhido no carrinho e no pedido
                                </span>
                            </span>
                            <span className="text-right">
                                {discountPercent > 0 ? (
                                    <span className="block text-xs font-semibold text-slate-400 line-through">
                                        {formatCurrency(option.priceInCents)}
                                    </span>
                                ) : null}
                                <span className="block text-base font-black text-primary">
                                    {formatCurrency(
                                        applyProductDiscount(
                                            option.priceInCents,
                                            discountPercent,
                                        ),
                                    )}
                                </span>
                            </span>
                        </button>
                    ))}
                </div>
            </DialogContent>
        </Dialog>
    );
}

type ConsultationDialogProps = {
    productName: string | null;
    whatsappLink: string;
    onClose: () => void;
};

export function ConsultationDialog({
    productName,
    whatsappLink,
    onClose,
}: ConsultationDialogProps) {
    return (
        <Dialog
            onOpenChange={(open) => !open && onClose()}
            open={productName != null}
        >
            <DialogContent className="max-w-md rounded-xl bg-white p-6">
                <DialogHeader>
                    <DialogTitle className="text-xl font-bold text-slate-900">
                        Atendimento pelo WhatsApp
                    </DialogTitle>
                    <DialogDescription className="text-sm leading-6 text-slate-600">
                        {productName} está com preço sob consulta e é tratado
                        diretamente pelo WhatsApp. Deseja abrir a conversa
                        agora?
                    </DialogDescription>
                </DialogHeader>
                <div className="mt-6 flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
                    <button
                        className="rounded-lg border border-slate-200 px-4 py-2 text-sm font-semibold text-slate-700"
                        onClick={onClose}
                        type="button"
                    >
                        Agora não
                    </button>
                    <a
                        className="rounded-lg bg-emerald-600 px-4 py-2 text-center text-sm font-semibold text-white"
                        href={whatsappLink}
                        rel="noopener noreferrer"
                        target="_blank"
                    >
                        Abrir WhatsApp
                    </a>
                </div>
            </DialogContent>
        </Dialog>
    );
}
