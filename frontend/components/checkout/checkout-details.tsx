import { ProductImage } from "@/components/shared/product-image";
import {
    formatDocument,
    formatPhone,
} from "@/components/profile/profile-page-helpers";
import type { Address } from "@/lib/types";
import { formatCurrency, formatProductSizeLabel } from "@/lib/utils";

export type CheckoutDisplayItem = {
    uuid: string;
    name: string;
    grams: number;
    quantity: number;
    imageUrl: string;
    totalPriceInCents: number;
};

export function CheckoutCustomerDocument({
    document,
    onEdit,
}: {
    document: string;
    onEdit: () => void;
}) {
    return (
        <section className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
            <div className="flex flex-wrap items-start justify-between gap-3">
                <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-3">
                        <span
                            aria-hidden="true"
                            className="material-symbols-outlined shrink-0 text-2xl leading-none text-primary"
                        >
                            badge
                        </span>
                        <h2 className="font-display text-xl font-bold text-slate-950">
                            CPF ou CNPJ
                        </h2>
                    </div>
                    <p className="mt-2 pl-9 text-sm leading-6 text-slate-600">
                        {formatDocument(document)}
                    </p>
                </div>
                <button
                    className="min-h-11 rounded-lg border border-slate-200 bg-white px-4 py-2 text-sm font-bold text-primary hover:border-primary/30 hover:bg-primary/5 focus:outline-none focus:ring-4 focus:ring-primary/20"
                    onClick={onEdit}
                    type="button"
                >
                    Alterar CPF
                </button>
            </div>
        </section>
    );
}

export function DeliveryAddress({
    address,
    onEdit,
}: {
    address: Address;
    onEdit: () => void;
}) {
    return (
        <section className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
            <div className="flex flex-wrap items-start justify-between gap-3">
                <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-3">
                        <span
                            aria-hidden="true"
                            className="material-symbols-outlined shrink-0 text-2xl leading-none text-[#8a642e]"
                        >
                            home_pin
                        </span>
                        <h2 className="font-display text-xl font-bold text-slate-950">
                            Entrega em
                        </h2>
                    </div>
                    <address className="mt-2 pl-9 not-italic text-sm leading-6 text-slate-600">
                        {address.street}, {address.number}
                        <br />
                        {address.neighborhood} · {address.city} —{" "}
                        {address.state}
                        <br />
                        CEP {address.zipCode}
                    </address>
                </div>
                <button
                    className="min-h-11 rounded-lg border border-slate-200 bg-white px-4 py-2 text-sm font-bold text-primary hover:border-primary/30 hover:bg-primary/5 focus:outline-none focus:ring-4 focus:ring-primary/20"
                    onClick={onEdit}
                    type="button"
                >
                    Alterar endereço
                </button>
            </div>
        </section>
    );
}

export function CheckoutReviewDetails({
    document,
    notes,
    onEdit,
    phone,
}: {
    document: string;
    notes: string;
    onEdit: () => void;
    phone?: string | null;
}) {
    return (
        <section className="rounded-xl border border-primary/20 bg-white p-6 shadow-sm">
            <div className="flex flex-wrap items-start justify-between gap-4">
                <div className="flex min-w-0 items-start gap-3">
                    <span
                        aria-hidden="true"
                        className="material-symbols-outlined shrink-0 text-2xl leading-none text-primary"
                    >
                        receipt_long
                    </span>
                    <div>
                        <h2 className="font-display text-xl font-bold text-slate-950">
                            Confira antes de confirmar
                        </h2>
                        <p className="mt-1 max-w-2xl text-sm leading-6 text-slate-600">
                            Revise seus dados, a entrega, os produtos e o valor
                            final. O pedido só será criado após sua confirmação.
                        </p>
                    </div>
                </div>
                <button
                    className="min-h-11 rounded-lg border border-slate-200 bg-white px-4 py-2 text-sm font-bold text-primary hover:border-primary/30 hover:bg-primary/5 focus:outline-none focus:ring-4 focus:ring-primary/20"
                    onClick={onEdit}
                    type="button"
                >
                    Voltar e editar
                </button>
            </div>
            <dl className="mt-5 grid gap-4 border-t border-slate-100 pt-5 text-sm sm:grid-cols-2">
                <div>
                    <dt className="font-bold text-slate-900">CPF ou CNPJ</dt>
                    <dd className="mt-1 text-slate-600">
                        {formatDocument(document)}
                    </dd>
                </div>
                {phone ? (
                    <div>
                        <dt className="font-bold text-slate-900">Telefone</dt>
                        <dd className="mt-1 text-slate-600">
                            {formatPhone(phone)}
                        </dd>
                    </div>
                ) : null}
                <div className="sm:col-span-2">
                    <dt className="font-bold text-slate-900">Observações</dt>
                    <dd className="mt-1 whitespace-pre-wrap text-slate-600">
                        {notes || "Nenhuma observação para este pedido."}
                    </dd>
                </div>
            </dl>
        </section>
    );
}

export function OrderItems({ items }: { items: CheckoutDisplayItem[] }) {
    return (
        <section className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
            <h2 className="font-display text-xl font-bold text-slate-950">
                Produtos do pedido
            </h2>
            <div className="mt-5 divide-y divide-slate-100">
                {items.map((item) => (
                    <article
                        className="grid grid-cols-[4.5rem_minmax(0,1fr)] gap-4 py-4 sm:grid-cols-[5rem_minmax(0,1fr)_auto] first:pt-0 last:pb-0"
                        key={item.uuid}
                    >
                        <ProductImage
                            alt={item.name}
                            className="size-[4.5rem] shrink-0 rounded-lg object-cover sm:size-20"
                            sizes="(max-width: 639px) 72px, 80px"
                            src={item.imageUrl}
                        />
                        <div className="min-w-0 flex-1">
                            <h3 className="font-bold text-slate-950">
                                {item.name}
                            </h3>
                            <p className="mt-1 text-sm text-slate-500">
                                {formatProductSizeLabel(item.grams)} ·{" "}
                                {item.quantity} un.
                            </p>
                        </div>
                        <p className="col-start-2 font-bold text-slate-950 sm:col-start-3 sm:row-start-1">
                            {formatCurrency(item.totalPriceInCents)}
                        </p>
                    </article>
                ))}
            </div>
        </section>
    );
}

export function OrderNotes({
    notes,
    onChange,
}: {
    notes: string;
    onChange: (value: string) => void;
}) {
    return (
        <section className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
            <label
                className="font-bold text-slate-900"
                htmlFor="checkout-notes"
            >
                Observações para o pedido{" "}
                <span className="font-normal text-slate-500">(opcional)</span>
            </label>
            <textarea
                className="mt-3 min-h-24 w-full resize-y rounded-lg border border-slate-300 bg-white px-4 py-3 text-sm outline-none focus:border-primary focus:ring-4 focus:ring-primary/15"
                id="checkout-notes"
                maxLength={500}
                onChange={(event) => onChange(event.currentTarget.value)}
                placeholder="Ex.: entregar em horário comercial"
                value={notes}
            />
        </section>
    );
}
