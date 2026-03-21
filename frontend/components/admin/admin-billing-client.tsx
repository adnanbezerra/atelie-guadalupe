"use client";

import { useMemo, useState } from "react";
import { useOrders } from "@/hooks/use-orders";
import { Order, Product } from "@/lib/types";
import { formatCurrency, formatDate } from "@/lib/utils";

type AdminBillingClientProps = {
    initialOrders: Order[];
    initialProducts: Product[];
};

export function AdminBillingClient({
    initialOrders,
    initialProducts,
}: AdminBillingClientProps) {
    const [selectedProduct, setSelectedProduct] = useState(
        initialProducts[0]?.uuid ?? "",
    );
    const [customPrice, setCustomPrice] = useState("");
    const [customerName, setCustomerName] = useState("");
    const [labelText, setLabelText] = useState("");
    const orders = useOrders(initialOrders);

    const previewLink = useMemo(() => {
        if (!selectedProduct || !customerName) {
            return "Seu link aparecerá aqui";
        }

        return `https://atelie.guadalupe/checkout/manual?product=${selectedProduct}&customer=${encodeURIComponent(
            customerName,
        )}&price=${customPrice || "padrao"}`;
    }, [customPrice, customerName, selectedProduct]);

    return (
        <div className="flex min-h-full flex-col overflow-y-auto">
            <header className="sticky top-0 z-10 flex h-16 items-center justify-between border-b border-slate-200 bg-white px-8">
                <h2 className="font-display text-lg font-semibold">
                    Painel Administrativo
                </h2>
                <div className="flex items-center gap-4">
                    <button className="relative rounded-full p-2 text-slate-500 hover:bg-slate-100">
                        <span className="material-symbols-outlined">
                            notifications
                        </span>
                        <span className="absolute right-2 top-2 size-2 rounded-full bg-red-500" />
                    </button>
                    <div className="flex items-center gap-3 border-l border-slate-200 pl-4">
                        <div className="hidden text-right sm:block">
                            <p className="text-sm font-semibold">
                                Admin Guadalupe
                            </p>
                            <p className="text-xs text-slate-500">Gestor</p>
                        </div>
                        <div className="flex size-10 items-center justify-center overflow-hidden rounded-full bg-primary/20 text-primary">
                            AG
                        </div>
                    </div>
                </div>
            </header>

            <div className="mx-auto max-w-5xl p-8">
                <div className="mb-8 border-b border-slate-200">
                    <nav className="flex gap-8">
                        <button className="border-b-2 border-primary px-1 pb-4 text-sm font-bold text-primary">
                            Gerar Link de Cobrança
                        </button>
                        <button className="border-b-2 border-transparent px-1 pb-4 text-sm font-medium text-slate-500">
                            Criar Creme Personalizado
                        </button>
                    </nav>
                </div>

                <section className="mb-12 grid grid-cols-1 gap-8 lg:grid-cols-3">
                    <div className="space-y-6 lg:col-span-2">
                        <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
                            <h3 className="font-display text-xl font-bold">
                                Configurar Checkout
                            </h3>
                            <p className="mb-6 mt-2 text-sm text-slate-500">
                                Crie um link de pagamento direto para um produto
                                específico ou oferta personalizada.
                            </p>
                            <form className="space-y-4">
                                <div>
                                    <label className="mb-1.5 block text-sm font-medium">
                                        Produto Base
                                    </label>
                                    <select
                                        className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2.5"
                                        onChange={(event) =>
                                            setSelectedProduct(
                                                event.target.value,
                                            )
                                        }
                                        value={selectedProduct}
                                    >
                                        {initialProducts.map((product) => (
                                            <option
                                                key={product.uuid}
                                                value={product.uuid}
                                            >
                                                {product.name}
                                            </option>
                                        ))}
                                    </select>
                                </div>
                                <div className="grid grid-cols-2 gap-4">
                                    <div>
                                        <label className="mb-1.5 block text-sm font-medium">
                                            Preço Personalizado (R$)
                                        </label>
                                        <input
                                            className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2.5"
                                            onChange={(event) =>
                                                setCustomPrice(
                                                    event.target.value,
                                                )
                                            }
                                            placeholder="0,00"
                                            value={customPrice}
                                        />
                                    </div>
                                    <div>
                                        <label className="mb-1.5 block text-sm font-medium">
                                            Expiração (Opcional)
                                        </label>
                                        <input
                                            className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2.5"
                                            type="date"
                                        />
                                    </div>
                                </div>
                                <div>
                                    <label className="mb-1.5 block text-sm font-medium">
                                        Nome do Cliente (Opcional)
                                    </label>
                                    <input
                                        className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2.5"
                                        onChange={(event) =>
                                            setCustomerName(event.target.value)
                                        }
                                        placeholder="Ex: Maria Oliveira"
                                        value={customerName}
                                    />
                                </div>
                                <button
                                    className="mt-4 w-full rounded-lg bg-primary py-3 font-bold text-white"
                                    type="button"
                                >
                                    Gerar URL Única
                                </button>
                            </form>
                        </div>
                    </div>
                    <div className="lg:col-span-1">
                        <div className="flex h-full flex-col items-center justify-center rounded-xl border border-primary/20 bg-primary/5 p-6 text-center">
                            <div className="mb-4 flex size-16 items-center justify-center rounded-full bg-white text-primary shadow-sm">
                                <span className="material-symbols-outlined text-4xl">
                                    link
                                </span>
                            </div>
                            <h4 className="font-display text-lg font-bold">
                                Seu link aparecerá aqui
                            </h4>
                            <p className="mb-6 mt-2 text-sm text-slate-500">
                                Após preencher os dados, o link de checkout será
                                gerado para compartilhamento.
                            </p>
                            <div className="w-full rounded-lg bg-slate-200 px-4 py-3 text-left text-xs text-slate-600">
                                {previewLink}
                            </div>
                        </div>
                    </div>
                </section>

                <section>
                    <div className="mb-6 flex items-center justify-between">
                        <h3 className="font-display text-2xl font-bold">
                            Criar Creme Personalizado
                        </h3>
                        <span className="rounded-full bg-green-100 px-3 py-1 text-xs font-bold uppercase tracking-wider text-green-700">
                            Novo Pedido Especial
                        </span>
                    </div>
                    <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
                        <div className="p-8">
                            <form className="space-y-8">
                                <div className="grid grid-cols-1 gap-8 md:grid-cols-2">
                                    <div className="space-y-4">
                                        <h4 className="flex items-center gap-2 font-semibold text-slate-700">
                                            <span className="flex size-6 items-center justify-center rounded-full bg-primary/10 text-xs font-bold text-primary">
                                                1
                                            </span>
                                            Seleção da Base
                                        </h4>
                                        <div className="grid grid-cols-2 gap-3">
                                            {initialProducts
                                                .slice(0, 2)
                                                .map((product, index) => (
                                                    <label
                                                        key={product.uuid}
                                                        className={`relative flex cursor-pointer flex-col rounded-xl border-2 p-4 ${
                                                            index === 0
                                                                ? "border-primary bg-primary/5"
                                                                : "border-slate-200"
                                                        }`}
                                                    >
                                                        <span className="text-sm font-bold">
                                                            {product.name}
                                                        </span>
                                                        <span className="text-xs text-slate-500">
                                                            {index === 0
                                                                ? "Pele Seca/Mista"
                                                                : "Pele Oleosa"}
                                                        </span>
                                                        {index === 0 ? (
                                                            <span className="material-symbols-outlined absolute right-2 top-2 text-sm text-primary">
                                                                check_circle
                                                            </span>
                                                        ) : null}
                                                    </label>
                                                ))}
                                        </div>
                                    </div>
                                    <div className="space-y-4">
                                        <h4 className="flex items-center gap-2 font-semibold text-slate-700">
                                            <span className="flex size-6 items-center justify-center rounded-full bg-primary/10 text-xs font-bold text-primary">
                                                2
                                            </span>
                                            Óleos Essenciais (Máx 3)
                                        </h4>
                                        <div className="flex flex-wrap gap-2">
                                            {[
                                                "Lavanda",
                                                "Alecrim",
                                                "Bergamota",
                                                "Melaleuca",
                                                "Menta",
                                            ].map((item, index) => (
                                                <span
                                                    key={item}
                                                    className={`inline-flex items-center rounded-full border px-3 py-1.5 text-sm ${
                                                        index === 1 ||
                                                        index === 3
                                                            ? "border-primary bg-primary/20 text-primary"
                                                            : "border-slate-200 bg-slate-100"
                                                    }`}
                                                >
                                                    {item}
                                                </span>
                                            ))}
                                        </div>
                                    </div>
                                </div>

                                <div className="space-y-4 border-t border-slate-100 pt-4">
                                    <h4 className="flex items-center gap-2 font-semibold text-slate-700">
                                        <span className="flex size-6 items-center justify-center rounded-full bg-primary/10 text-xs font-bold text-primary">
                                            3
                                        </span>
                                        Personalização do Rótulo
                                    </h4>
                                    <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
                                        <div className="space-y-4">
                                            <div>
                                                <label className="mb-1.5 block text-sm font-medium">
                                                    Texto do Rótulo
                                                </label>
                                                <input
                                                    className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2.5"
                                                    onChange={(event) =>
                                                        setLabelText(
                                                            event.target.value,
                                                        )
                                                    }
                                                    placeholder="Ex: Creme de Noite da Maria"
                                                    value={labelText}
                                                />
                                            </div>
                                            <div>
                                                <label className="mb-1.5 block text-sm font-medium">
                                                    Instruções de Uso
                                                </label>
                                                <textarea
                                                    className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2.5"
                                                    placeholder="Ex: Aplicar antes de dormir..."
                                                    rows={3}
                                                />
                                            </div>
                                        </div>
                                        <div className="flex flex-col items-center justify-center rounded-xl border-2 border-dashed border-slate-200 bg-slate-50 p-6 text-center">
                                            <div className="flex h-24 w-48 flex-col items-center justify-center rounded-lg border border-slate-200 bg-white p-4 shadow-inner">
                                                <p className="font-display text-xs font-bold text-primary">
                                                    ATELIÊ GUADALUPE
                                                </p>
                                                <div className="mb-2 mt-1 h-px w-full bg-primary/30" />
                                                <p className="text-[10px] font-medium leading-tight">
                                                    {labelText ||
                                                        "Creme de Noite da Maria"}
                                                </p>
                                                <p className="mt-1 text-[8px] text-slate-400">
                                                    Personalizado para você
                                                </p>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </form>
                        </div>
                    </div>
                </section>

                <section className="mt-8 rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
                    <h3 className="mb-4 text-lg font-bold">Pedidos Recentes</h3>
                    <div className="grid gap-4 md:grid-cols-3">
                        {orders.data.slice(0, 3).map((order) => (
                            <div
                                key={order.uuid}
                                className="rounded-lg border border-slate-200 p-4"
                            >
                                <p className="font-semibold text-slate-900">
                                    #{order.uuid.slice(0, 8)}
                                </p>
                                <p className="mt-1 text-sm text-slate-500">
                                    {formatDate(order.placedAt)}
                                </p>
                                <p className="mt-2 font-bold text-primary">
                                    {formatCurrency(order.totalInCents)}
                                </p>
                            </div>
                        ))}
                    </div>
                </section>
            </div>
        </div>
    );
}
