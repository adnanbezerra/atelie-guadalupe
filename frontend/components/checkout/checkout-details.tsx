import Link from "next/link";
import { ProductImage } from "@/components/shared/product-image";
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

export function DeliveryAddress({ address }: { address: Address | null }) {
    return (
        <section className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
            <div className="flex items-start gap-4">
                <span
                    aria-hidden="true"
                    className="material-symbols-outlined text-[#8a642e]"
                >
                    home_pin
                </span>
                <div>
                    <h2 className="font-display text-xl font-bold text-slate-950">
                        Entrega em
                    </h2>
                    {address ? (
                        <address className="mt-2 not-italic text-sm leading-6 text-slate-600">
                            {address.street}, {address.number}
                            <br />
                            {address.neighborhood} · {address.city} —{" "}
                            {address.state}
                            <br />
                            CEP {address.zipCode}
                        </address>
                    ) : (
                        <p className="mt-2 text-sm text-slate-600">
                            Cadastre um endereço para continuar.
                        </p>
                    )}
                </div>
            </div>
            {!address ? (
                <Link
                    className="mt-5 inline-flex min-h-11 items-center rounded-lg border border-primary px-4 py-2 text-sm font-bold text-primary hover:bg-primary/5"
                    href="/perfil"
                >
                    Cadastrar endereço
                </Link>
            ) : null}
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
