"use client";

import { useMemo, useState } from "react";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
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
    const [tab, setTab] = useState("cobranca");
    const [selectedProduct, setSelectedProduct] = useState(
        initialProducts[0]?.uuid ?? "",
    );
    const [customPrice, setCustomPrice] = useState("");
    const [customerName, setCustomerName] = useState("");
    const [labelText, setLabelText] = useState("");
    const orders = useOrders(initialOrders);

    const previewLink = useMemo(() => {
        if (!selectedProduct || !customerName) {
            return "Preencha produto e cliente para montar uma URL de atendimento.";
        }

        return `https://atelie.guadalupe/checkout/manual?product=${selectedProduct}&customer=${encodeURIComponent(
            customerName,
        )}&price=${customPrice || "padrao"}`;
    }, [customPrice, customerName, selectedProduct]);

    return (
        <div className="space-y-8">
            <div>
                <p className="text-sm uppercase tracking-[0.35em] text-primary/70">
                    Vendas e Checkout
                </p>
                <h2 className="mt-2 font-display text-4xl font-bold text-slate-900">
                    Cobranca e Customizacao
                </h2>
                <p className="mt-3 max-w-3xl text-sm leading-7 text-slate-600">
                    O Stitch traz um fluxo rico para link de cobranca e creme
                    personalizado. Como o contrato atual ainda nao expõe
                    endpoints especificos para isso, a tela usa produtos e
                    pedidos reais como base e deixa o fluxo pronto para plugar o
                    backend assim que ele existir.
                </p>
            </div>

            <Tabs onValueChange={setTab} value={tab}>
                <TabsList>
                    <TabsTrigger value="cobranca">
                        Gerar Link de Cobranca
                    </TabsTrigger>
                    <TabsTrigger value="customizacao">
                        Criar Creme Personalizado
                    </TabsTrigger>
                </TabsList>

                <TabsContent className="mt-6" value="cobranca">
                    <div className="grid gap-6 lg:grid-cols-[1.5fr_0.9fr]">
                        <Card className="p-6">
                            <h3 className="font-display text-2xl font-bold text-slate-900">
                                Gerar URL unica
                            </h3>
                            <div className="mt-6 grid gap-4 md:grid-cols-2">
                                <select
                                    className="h-11 rounded-2xl border border-slate-200 bg-white px-4 text-sm shadow-sm outline-none"
                                    onChange={(event) =>
                                        setSelectedProduct(event.target.value)
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
                                <Input
                                    onChange={(event) =>
                                        setCustomPrice(event.target.value)
                                    }
                                    placeholder="Preco personalizado em centavos"
                                    value={customPrice}
                                />
                                <Input
                                    onChange={(event) =>
                                        setCustomerName(event.target.value)
                                    }
                                    placeholder="Nome do cliente"
                                    value={customerName}
                                />
                                <Input placeholder="Expiracao (ex: 48h)" />
                            </div>
                            <Card className="mt-6 bg-slate-50 p-4">
                                <p className="text-xs uppercase tracking-[0.25em] text-slate-500">
                                    Estado da integracao
                                </p>
                                <p className="mt-3 text-sm leading-7 text-slate-600">
                                    Sem endpoint de checkout customizado em
                                    `docs/API.md`. Esta area serve como ponte
                                    visual e operacional ate o backend
                                    consolidar essa parte do fluxo.
                                </p>
                            </Card>
                        </Card>

                        <Card className="p-6">
                            <h3 className="font-display text-2xl font-bold text-slate-900">
                                Preview do link
                            </h3>
                            <div className="mt-6 rounded-[1.5rem] border border-dashed border-primary/30 bg-primary/5 p-5">
                                <p className="text-xs uppercase tracking-[0.25em] text-primary/70">
                                    URL de atendimento
                                </p>
                                <p className="mt-4 break-all text-sm leading-7 text-slate-700">
                                    {previewLink}
                                </p>
                            </div>
                            <div className="mt-6 space-y-4">
                                <p className="text-sm text-slate-600">
                                    Ultimos pedidos para referencia de cobranca:
                                </p>
                                {orders.data.slice(0, 3).map((order) => (
                                    <div
                                        key={order.uuid}
                                        className="rounded-2xl border border-slate-200 bg-white p-4"
                                    >
                                        <p className="font-semibold text-slate-900">
                                            #{order.uuid.slice(0, 8)}
                                        </p>
                                        <p className="mt-1 text-sm text-slate-500">
                                            {formatDate(order.placedAt)} ·{" "}
                                            {formatCurrency(order.totalInCents)}
                                        </p>
                                    </div>
                                ))}
                            </div>
                        </Card>
                    </div>
                </TabsContent>

                <TabsContent className="mt-6" value="customizacao">
                    <div className="grid gap-6 lg:grid-cols-[1.4fr_0.8fr]">
                        <Card className="p-6">
                            <h3 className="font-display text-2xl font-bold text-slate-900">
                                Novo Pedido Especial
                            </h3>
                            <div className="mt-6 space-y-6">
                                <div>
                                    <p className="text-sm font-semibold text-slate-700">
                                        1. Selecione a base
                                    </p>
                                    <div className="mt-3 grid gap-3 md:grid-cols-2">
                                        {initialProducts
                                            .slice(0, 4)
                                            .map((product) => (
                                                <label
                                                    key={product.uuid}
                                                    className="flex items-start gap-3 rounded-[1.5rem] border border-slate-200 bg-white p-4"
                                                >
                                                    <input
                                                        checked={
                                                            selectedProduct ===
                                                            product.uuid
                                                        }
                                                        onChange={() =>
                                                            setSelectedProduct(
                                                                product.uuid,
                                                            )
                                                        }
                                                        type="radio"
                                                    />
                                                    <div>
                                                        <p className="font-semibold text-slate-900">
                                                            {product.name}
                                                        </p>
                                                        <p className="mt-2 text-sm text-slate-500">
                                                            {
                                                                product.shortDescription
                                                            }
                                                        </p>
                                                    </div>
                                                </label>
                                            ))}
                                    </div>
                                </div>
                                <div>
                                    <p className="text-sm font-semibold text-slate-700">
                                        2. Oleos e acabamento
                                    </p>
                                    <div className="mt-3 flex flex-wrap gap-2">
                                        {[
                                            "Lavanda",
                                            "Alecrim",
                                            "Camomila",
                                            "Oliva",
                                            "Cedro",
                                        ].map((item) => (
                                            <span
                                                key={item}
                                                className="rounded-full border border-slate-200 bg-slate-50 px-4 py-2 text-sm font-medium text-slate-700"
                                            >
                                                {item}
                                            </span>
                                        ))}
                                    </div>
                                </div>
                                <div>
                                    <p className="text-sm font-semibold text-slate-700">
                                        3. Rotulo e instrucoes
                                    </p>
                                    <div className="mt-3 grid gap-4">
                                        <Input
                                            onChange={(event) =>
                                                setLabelText(event.target.value)
                                            }
                                            placeholder="Texto do rotulo"
                                            value={labelText}
                                        />
                                        <textarea
                                            className="min-h-32 rounded-[1.5rem] border border-slate-200 bg-white px-4 py-3 text-sm shadow-sm outline-none"
                                            placeholder="Instrucoes de uso"
                                        />
                                    </div>
                                </div>
                            </div>
                        </Card>

                        <Card className="p-6">
                            <h3 className="font-display text-2xl font-bold text-slate-900">
                                Preview do Rotulo
                            </h3>
                            <div className="mt-6 rounded-[1.75rem] border border-white/70 bg-[linear-gradient(180deg,#fdf8ee,#efe3ce)] p-8 shadow-inner">
                                <p className="text-xs uppercase tracking-[0.35em] text-amber-800">
                                    Atelie Guadalupe
                                </p>
                                <p className="mt-5 font-display text-3xl font-bold text-slate-900">
                                    {labelText ||
                                        "Creme Botânico Personalizado"}
                                </p>
                                <p className="mt-4 text-sm leading-7 text-slate-600">
                                    Formula inspirada no Stitch, pronta para
                                    receber o endpoint de producao assim que o
                                    backend evoluir.
                                </p>
                            </div>
                        </Card>
                    </div>
                </TabsContent>
            </Tabs>
        </div>
    );
}
