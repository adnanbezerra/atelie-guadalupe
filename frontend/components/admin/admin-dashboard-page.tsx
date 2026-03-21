import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { formatCurrency } from "@/lib/format";
import type { Order, Product } from "@/lib/types";

export function AdminDashboardPage({
    orders,
    products,
}: {
    orders: Order[];
    products: Product[];
}) {
    const totalSales = orders.reduce(
        (sum, order) => sum + order.totalInCents,
        0,
    );
    const avgTicket = orders.length
        ? Math.round(totalSales / orders.length)
        : 0;
    const lowStock = products.filter(
        (product) => product.stock > 0 && product.stock <= 5,
    );

    return (
        <div className="space-y-8">
            <div>
                <p className="text-xs font-semibold uppercase tracking-[0.24em] text-primary">
                    Dashboard
                </p>
                <h1 className="mt-3 font-display text-5xl font-bold">
                    Visão geral do ateliê
                </h1>
                <p className="mt-4 max-w-2xl text-sm leading-7 text-muted-foreground">
                    A estrutura segue o Stitch: KPIs no topo, histórico de
                    pedidos e atenção a estoque.
                </p>
            </div>

            <div className="grid gap-6 md:grid-cols-3">
                <Card className="p-6">
                    <p className="text-xs uppercase tracking-[0.24em] text-muted-foreground">
                        Vendas totais
                    </p>
                    <p className="mt-3 text-3xl font-bold">
                        {formatCurrency(totalSales)}
                    </p>
                </Card>
                <Card className="p-6">
                    <p className="text-xs uppercase tracking-[0.24em] text-muted-foreground">
                        Pedidos
                    </p>
                    <p className="mt-3 text-3xl font-bold">{orders.length}</p>
                </Card>
                <Card className="p-6">
                    <p className="text-xs uppercase tracking-[0.24em] text-muted-foreground">
                        Ticket médio
                    </p>
                    <p className="mt-3 text-3xl font-bold">
                        {formatCurrency(avgTicket)}
                    </p>
                </Card>
            </div>

            <div className="grid gap-6 lg:grid-cols-[1.4fr_0.6fr]">
                <Card className="overflow-hidden">
                    <div className="border-b border-border px-6 py-4">
                        <h2 className="font-display text-2xl font-bold">
                            Pedidos recentes
                        </h2>
                    </div>
                    <div className="overflow-x-auto">
                        <table className="min-w-full text-left text-sm">
                            <thead className="bg-secondary/60 text-xs uppercase tracking-[0.24em] text-muted-foreground">
                                <tr>
                                    <th className="px-6 py-4">Pedido</th>
                                    <th className="px-6 py-4">Data</th>
                                    <th className="px-6 py-4">Status</th>
                                    <th className="px-6 py-4">Total</th>
                                </tr>
                            </thead>
                            <tbody>
                                {orders.slice(0, 6).map((order) => (
                                    <tr
                                        key={order.uuid}
                                        className="border-t border-border/70"
                                    >
                                        <td className="px-6 py-4 font-medium">
                                            {order.uuid.slice(0, 8)}
                                        </td>
                                        <td className="px-6 py-4">
                                            {new Date(
                                                order.createdAt,
                                            ).toLocaleDateString("pt-BR")}
                                        </td>
                                        <td className="px-6 py-4">
                                            <Badge tone="muted">
                                                {order.status}
                                            </Badge>
                                        </td>
                                        <td className="px-6 py-4 font-semibold text-primary">
                                            {formatCurrency(order.totalInCents)}
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </Card>

                <Card className="p-6">
                    <h2 className="font-display text-2xl font-bold">
                        Alertas de estoque
                    </h2>
                    <div className="mt-6 space-y-4">
                        {lowStock.length ? (
                            lowStock.map((product) => (
                                <div
                                    key={product.uuid}
                                    className="rounded-2xl border border-amber-200 bg-amber-50 p-4"
                                >
                                    <p className="font-semibold text-amber-900">
                                        {product.name}
                                    </p>
                                    <p className="mt-1 text-sm text-amber-800">
                                        {product.stock} unidades restantes
                                    </p>
                                </div>
                            ))
                        ) : (
                            <p className="text-sm text-muted-foreground">
                                Nenhum item crítico no momento.
                            </p>
                        )}
                    </div>
                </Card>
            </div>
        </div>
    );
}
