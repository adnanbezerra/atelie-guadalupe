"use client";

import { useMemo, useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { useAdminOrders } from "@/hooks/use-admin-orders";
import { formatCurrency } from "@/lib/format";
import type { Order, OrderStatus } from "@/lib/types";

const NEXT_STATUSES: OrderStatus[] = [
    "PENDING",
    "AWAITING_PAYMENT",
    "PAID",
    "PROCESSING",
    "SHIPPED",
    "DELIVERED",
    "CANCELLED",
];

export function AdminBillingPageClient({
    initialOrders,
}: {
    initialOrders: Order[];
}) {
    const orders = useAdminOrders(initialOrders);
    const [selectedOrder, setSelectedOrder] = useState(
        initialOrders[0]?.uuid ?? "",
    );
    const [generatedLink, setGeneratedLink] = useState("");
    const [feedback, setFeedback] = useState<string | null>(null);

    const order = useMemo(
        () =>
            orders.data.find((item) => item.uuid === selectedOrder) ??
            orders.data[0],
        [orders.data, selectedOrder],
    );

    return (
        <div className="space-y-8">
            <div>
                <p className="text-xs font-semibold uppercase tracking-[0.24em] text-primary">
                    Cobrança e customização
                </p>
                <h1 className="mt-3 font-display text-5xl font-bold">
                    Cobrança e customização
                </h1>
            </div>

            <div className="grid gap-8 xl:grid-cols-[0.95fr_1.05fr]">
                <Card className="p-6">
                    <Badge tone="muted">Pedido</Badge>
                    <h2 className="mt-4 font-display text-2xl font-bold">
                        Gerar link de cobrança
                    </h2>
                    <p className="mt-3 text-sm leading-7 text-muted-foreground">
                        A API documenta pedidos e atualização de status, mas não
                        documenta um endpoint próprio de cobrança. Aqui geramos
                        um link operacional enquanto o fluxo final não entra no
                        backend.
                    </p>
                    <div className="mt-6 space-y-4">
                        <Select
                            value={selectedOrder}
                            onChange={(event) =>
                                setSelectedOrder(event.target.value)
                            }
                        >
                            {orders.data.map((item) => (
                                <option key={item.uuid} value={item.uuid}>
                                    {item.uuid.slice(0, 8)} ·{" "}
                                    {formatCurrency(item.totalInCents)}
                                </option>
                            ))}
                        </Select>
                        <Input
                            placeholder="https://checkout.exemplo/pedido"
                            value={generatedLink}
                            onChange={(event) =>
                                setGeneratedLink(event.target.value)
                            }
                        />
                        {order ? (
                            <div className="rounded-2xl bg-secondary/70 p-4 text-sm">
                                <p className="font-semibold">
                                    Pedido selecionado: {order.uuid}
                                </p>
                                <p className="mt-1 text-muted-foreground">
                                    Total: {formatCurrency(order.totalInCents)}
                                </p>
                            </div>
                        ) : null}
                        <Button
                            className="w-full"
                            onClick={() =>
                                setFeedback(
                                    generatedLink
                                        ? `Link operacional associado ao pedido ${order?.uuid.slice(0, 8)}.`
                                        : "Informe o link de cobrança para registrar a operação manual.",
                                )
                            }
                        >
                            Salvar operação
                        </Button>
                    </div>
                </Card>

                <Card className="p-6">
                    <Badge>Fluxo produtivo</Badge>
                    <h2 className="mt-4 font-display text-2xl font-bold">
                        Criação de creme personalizado
                    </h2>
                    <CustomCreamForm />
                </Card>
            </div>

            <Card className="overflow-hidden">
                <div className="border-b border-border px-6 py-4">
                    <h2 className="font-display text-2xl font-bold">
                        Status dos pedidos
                    </h2>
                </div>
                <div className="grid gap-4 p-6 md:grid-cols-2 xl:grid-cols-3">
                    {orders.data.map((item) => (
                        <OrderStatusCard
                            key={item.uuid}
                            onChange={async (status) => {
                                await orders.updateOrderStatus(
                                    item.uuid,
                                    status,
                                );
                                setFeedback(
                                    `Status do pedido ${item.uuid.slice(0, 8)} atualizado para ${status}.`,
                                );
                            }}
                            order={item}
                        />
                    ))}
                </div>
            </Card>
            {feedback ? (
                <p className="text-sm text-muted-foreground">{feedback}</p>
            ) : null}
        </div>
    );
}

function OrderStatusCard({
    order,
    onChange,
}: {
    order: Order;
    onChange: (status: OrderStatus) => Promise<void>;
}) {
    const [status, setStatus] = useState<OrderStatus>(order.status);

    return (
        <Card className="p-5">
            <p className="text-xs uppercase tracking-[0.22em] text-muted-foreground">
                {order.uuid.slice(0, 8)}
            </p>
            <p className="mt-3 font-display text-2xl font-bold">
                {formatCurrency(order.totalInCents)}
            </p>
            <p className="mt-2 text-sm text-muted-foreground">
                {order.items.length} item(ns)
            </p>
            <div className="mt-4 flex gap-3">
                <Select
                    value={status}
                    onChange={(event) =>
                        setStatus(event.target.value as OrderStatus)
                    }
                >
                    {NEXT_STATUSES.map((option) => (
                        <option key={option} value={option}>
                            {option}
                        </option>
                    ))}
                </Select>
                <Button onClick={() => void onChange(status)}>Aplicar</Button>
            </div>
        </Card>
    );
}

function CustomCreamForm() {
    const [name, setName] = useState("");
    const [notes, setNotes] = useState("");
    const [aroma, setAroma] = useState("lavanda");
    const [result, setResult] = useState<string | null>(null);

    return (
        <form
            className="mt-6 space-y-4"
            onSubmit={(event) => {
                event.preventDefault();
                setResult(
                    `Brief criado para ${name || "cliente sem nome"} com aroma ${aroma}: ${notes || "sem observações"}.`,
                );
            }}
        >
            <Input
                placeholder="Cliente"
                value={name}
                onChange={(event) => setName(event.target.value)}
            />
            <Select
                value={aroma}
                onChange={(event) => setAroma(event.target.value)}
            >
                <option value="lavanda">Lavanda</option>
                <option value="alecrim">Alecrim</option>
                <option value="camomila">Camomila</option>
            </Select>
            <Textarea
                placeholder="Notas de formulação e intenção do pedido"
                value={notes}
                onChange={(event) => setNotes(event.target.value)}
            />
            <div className="flex gap-3">
                <Button type="submit">Salvar rascunho</Button>
                <Button
                    type="button"
                    variant="outline"
                    onClick={() => setResult(null)}
                >
                    Limpar
                </Button>
            </div>
            {result ? (
                <p className="text-sm text-muted-foreground">{result}</p>
            ) : null}
        </form>
    );
}
