"use client";

import { useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import {
    useAdminProducts,
    type AdminProductsPayload,
} from "@/hooks/use-admin-products";
import { formatCurrency } from "@/lib/format";
import type { Product } from "@/lib/types";

export function AdminProductsPageClient({
    initialData,
}: {
    initialData: AdminProductsPayload;
}) {
    const products = useAdminProducts(initialData);
    const [selected, setSelected] = useState<Product | null>(
        products.data.items[0] ?? null,
    );
    const [feedback, setFeedback] = useState<string | null>(null);

    return (
        <div className="grid gap-8 xl:grid-cols-[1.2fr_0.8fr]">
            <div className="space-y-6">
                <div>
                    <p className="text-xs font-semibold uppercase tracking-[0.24em] text-primary">
                        Produtos
                    </p>
                    <h1 className="mt-3 font-display text-5xl font-bold">
                        Gestão de produtos
                    </h1>
                </div>

                <div className="grid gap-4 md:grid-cols-4">
                    <Card className="p-5">
                        <p className="text-xs uppercase tracking-[0.22em] text-muted-foreground">
                            Total
                        </p>
                        <p className="mt-3 text-3xl font-bold">
                            {products.data.pagination.total}
                        </p>
                    </Card>
                    <Card className="p-5">
                        <p className="text-xs uppercase tracking-[0.22em] text-muted-foreground">
                            Ativos
                        </p>
                        <p className="mt-3 text-3xl font-bold">
                            {
                                products.data.items.filter(
                                    (item) => item.isActive,
                                ).length
                            }
                        </p>
                    </Card>
                    <Card className="p-5">
                        <p className="text-xs uppercase tracking-[0.22em] text-muted-foreground">
                            Beleza
                        </p>
                        <p className="mt-3 text-3xl font-bold">
                            {
                                products.data.items.filter((item) =>
                                    item.line.name
                                        .toLowerCase()
                                        .includes("beleza"),
                                ).length
                            }
                        </p>
                    </Card>
                    <Card className="p-5">
                        <p className="text-xs uppercase tracking-[0.22em] text-muted-foreground">
                            Artesanato
                        </p>
                        <p className="mt-3 text-3xl font-bold">
                            {
                                products.data.items.filter((item) =>
                                    item.line.name
                                        .toLowerCase()
                                        .includes("arte"),
                                ).length
                            }
                        </p>
                    </Card>
                </div>

                <Card className="overflow-hidden">
                    <div className="border-b border-border px-6 py-4">
                        <h2 className="font-display text-2xl font-bold">
                            Tabela principal
                        </h2>
                    </div>
                    <div className="overflow-x-auto">
                        <table className="min-w-full text-left text-sm">
                            <thead className="bg-secondary/60 text-xs uppercase tracking-[0.24em] text-muted-foreground">
                                <tr>
                                    <th className="px-6 py-4">Produto</th>
                                    <th className="px-6 py-4">Linha</th>
                                    <th className="px-6 py-4">Preço base</th>
                                    <th className="px-6 py-4">Estoque</th>
                                    <th className="px-6 py-4">Status</th>
                                </tr>
                            </thead>
                            <tbody>
                                {products.data.items.map((product) => (
                                    <tr
                                        key={product.uuid}
                                        className="cursor-pointer border-t border-border/70 hover:bg-white/60"
                                        onClick={() => setSelected(product)}
                                    >
                                        <td className="px-6 py-4 font-semibold">
                                            {product.name}
                                        </td>
                                        <td className="px-6 py-4">
                                            {product.line.name}
                                        </td>
                                        <td className="px-6 py-4">
                                            {product.priceOptions[0]
                                                ? formatCurrency(
                                                      product.priceOptions[0]
                                                          .priceInCents,
                                                  )
                                                : "n/d"}
                                        </td>
                                        <td className="px-6 py-4">
                                            {product.stock}
                                        </td>
                                        <td className="px-6 py-4">
                                            <Badge
                                                tone={
                                                    product.isActive
                                                        ? "success"
                                                        : "warning"
                                                }
                                            >
                                                {product.isActive
                                                    ? "ativo"
                                                    : "inativo"}
                                            </Badge>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </Card>
            </div>

            <Card className="h-fit p-6">
                <h2 className="font-display text-2xl font-bold">
                    {selected ? "Editar produto" : "Novo produto"}
                </h2>
                <p className="mt-2 text-sm leading-7 text-muted-foreground">
                    O formulário usa o contrato documentado em `POST /products`
                    e `PATCH /products/:uuid`.
                </p>
                <ProductForm
                    key={selected?.uuid ?? "new"}
                    lines={products.data.lines}
                    onDelete={
                        selected
                            ? async () => {
                                  await products.deleteProduct(selected.uuid);
                                  setFeedback("Produto removido.");
                                  setSelected(null);
                              }
                            : undefined
                    }
                    onSubmit={async (payload) => {
                        if (selected) {
                            await products.updateProduct(
                                selected.uuid,
                                payload,
                            );
                            setFeedback("Produto atualizado.");
                        } else {
                            await products.createProduct(payload);
                            setFeedback("Produto criado.");
                        }
                        await products.refresh();
                    }}
                    product={selected}
                />
                {feedback ? (
                    <p className="mt-4 text-sm text-muted-foreground">
                        {feedback}
                    </p>
                ) : null}
            </Card>
        </div>
    );
}

function ProductForm({
    product,
    lines,
    onSubmit,
    onDelete,
}: {
    product: Product | null;
    lines: AdminProductsPayload["lines"];
    onSubmit: (payload: Record<string, unknown>) => Promise<void>;
    onDelete?: () => Promise<void>;
}) {
    const [name, setName] = useState(product?.name ?? "");
    const [lineUuid, setLineUuid] = useState(
        product?.line.uuid ?? lines[0]?.uuid ?? "",
    );
    const [shortDescription, setShortDescription] = useState(
        product?.shortDescription ?? "",
    );
    const [longDescription, setLongDescription] = useState(
        product?.longDescription ?? "",
    );
    const [stock, setStock] = useState(String(product?.stock ?? 0));
    const [imageBase64, setImageBase64] = useState("");

    return (
        <form
            className="mt-6 space-y-4"
            onSubmit={(event) => {
                event.preventDefault();
                void onSubmit({
                    name,
                    lineUuid,
                    stock: Number(stock),
                    shortDescription,
                    longDescription,
                    ...(imageBase64
                        ? {
                              image: {
                                  filename: "upload.png",
                                  contentType: "image/png",
                                  base64: imageBase64,
                              },
                          }
                        : {}),
                });
            }}
        >
            <Input
                placeholder="Nome do produto"
                value={name}
                onChange={(event) => setName(event.target.value)}
            />
            <Select
                value={lineUuid}
                onChange={(event) => setLineUuid(event.target.value)}
            >
                {lines.map((line) => (
                    <option key={line.uuid} value={line.uuid}>
                        {line.name}
                    </option>
                ))}
            </Select>
            <Input
                placeholder="Estoque"
                value={stock}
                onChange={(event) => setStock(event.target.value)}
            />
            <Input
                placeholder="Base64 da imagem"
                value={imageBase64}
                onChange={(event) => setImageBase64(event.target.value)}
            />
            <Textarea
                placeholder="Descrição curta"
                value={shortDescription}
                onChange={(event) => setShortDescription(event.target.value)}
            />
            <Textarea
                placeholder="Descrição longa"
                value={longDescription}
                onChange={(event) => setLongDescription(event.target.value)}
            />
            <div className="flex gap-3">
                <Button type="submit">
                    {product ? "Salvar alterações" : "Cadastrar produto"}
                </Button>
                {onDelete ? (
                    <Button
                        type="button"
                        variant="danger"
                        onClick={() => void onDelete()}
                    >
                        Excluir
                    </Button>
                ) : null}
            </div>
        </form>
    );
}
