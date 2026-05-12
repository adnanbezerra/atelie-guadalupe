"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useMemo, useState } from "react";
import {
    useAdminProducts,
    type AdminProductsPayload,
} from "@/hooks/use-admin-products";
import type {
    CreateProductInput,
    Product,
    ProductCategory,
    UpdateProductInput,
} from "@/lib/types";
import { formatCurrency } from "@/lib/utils";

type AdminProductEditorClientProps = {
    initialData: AdminProductsPayload;
    productUuid?: string;
};

type ProductFormPayload = CreateProductInput | UpdateProductInput;

function isCreateProductPayload(
    payload: ProductFormPayload,
): payload is CreateProductInput {
    return Boolean(
        payload.name &&
        payload.category &&
        payload.lineUuid &&
        payload.image &&
        payload.shortDescription &&
        payload.longDescription,
    );
}

export function AdminProductEditorClient({
    initialData,
    productUuid,
}: AdminProductEditorClientProps) {
    const router = useRouter();
    const products = useAdminProducts(initialData);
    const product = useMemo(
        () =>
            productUuid
                ? (products.data.items.find(
                      (item) => item.uuid === productUuid,
                  ) ?? null)
                : null,
        [productUuid, products.data.items],
    );
    const [feedback, setFeedback] = useState<string | null>(null);
    const isEditing = Boolean(productUuid);

    if (isEditing && !product) {
        return (
            <div className="flex flex-col">
                <AdminProductTopbar title="Produto não encontrado" />
                <div className="p-8">
                    <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
                        <p className="text-sm text-slate-600">
                            Não foi possível localizar este produto na listagem.
                        </p>
                        <Link
                            className="mt-4 inline-flex rounded-lg bg-primary px-4 py-2 text-sm font-bold text-white"
                            href="/admin/produtos"
                        >
                            Voltar para produtos
                        </Link>
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div className="flex flex-col">
            <AdminProductTopbar
                title={isEditing ? "Editar Produto" : "Cadastrar Novo Produto"}
            />
            <div className="mx-auto w-full max-w-6xl p-6 md:p-8">
                <div className="mb-8 flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
                    <div>
                        <p className="text-xs font-bold uppercase tracking-[0.22em] text-primary">
                            Catálogo
                        </p>
                        <h1 className="mt-2 text-3xl font-extrabold tracking-tight text-slate-900">
                            {isEditing
                                ? "Editar produto"
                                : "Adicionar novo produto"}
                        </h1>
                    </div>
                    <Link
                        className="inline-flex items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm font-bold text-slate-600 hover:bg-slate-50"
                        href="/admin/produtos"
                    >
                        <span className="material-symbols-outlined text-lg">
                            arrow_back
                        </span>
                        Produtos
                    </Link>
                </div>

                <ProductForm
                    key={product?.uuid ?? "new"}
                    feedback={feedback}
                    lines={products.data.lines}
                    onSubmit={async (payload) => {
                        try {
                            setFeedback(null);

                            if (product) {
                                await products.updateProduct(
                                    product.uuid,
                                    payload,
                                );
                                setFeedback("Produto atualizado.");
                                return;
                            }

                            if (!isCreateProductPayload(payload)) {
                                setFeedback(
                                    "Informe imagem e campos obrigatórios.",
                                );
                                return;
                            }

                            await products.createProduct(payload);
                            router.push("/admin/produtos");
                        } catch (error) {
                            setFeedback(
                                error instanceof Error
                                    ? error.message
                                    : "Falha ao salvar produto.",
                            );
                        }
                    }}
                    product={product}
                />
            </div>
        </div>
    );
}

function AdminProductTopbar({ title }: { title: string }) {
    return (
        <header className="sticky top-0 z-10 flex h-16 items-center justify-between border-b border-slate-200 bg-white px-6 shadow-sm md:px-8">
            <div className="flex min-w-0 items-center gap-4">
                <h2 className="truncate text-lg font-extrabold tracking-tight text-slate-900 md:text-xl">
                    {title}
                </h2>
                <span className="hidden rounded bg-blue-100 px-2 py-1 text-[10px] font-bold uppercase text-blue-700 sm:inline-flex">
                    Painel Administrativo
                </span>
            </div>
            <div className="flex items-center gap-3">
                <Link
                    className="rounded-full p-2 text-slate-400 hover:text-primary"
                    href="/"
                >
                    <span className="material-symbols-outlined">
                        storefront
                    </span>
                </Link>
            </div>
        </header>
    );
}

function ProductForm({
    product,
    lines,
    onSubmit,
    feedback,
}: {
    product: Product | null;
    lines: AdminProductsPayload["lines"];
    onSubmit: (payload: ProductFormPayload) => Promise<void>;
    feedback: string | null;
}) {
    const [name, setName] = useState(product?.name ?? "");
    const [lineUuid, setLineUuid] = useState(
        product?.line.uuid ?? lines[0]?.uuid ?? "",
    );
    const [category, setCategory] = useState<ProductCategory>(
        product?.category ?? "ARTISANAL",
    );
    const [shortDescription, setShortDescription] = useState(
        product?.shortDescription ?? "",
    );
    const [longDescription, setLongDescription] = useState(
        product?.longDescription ?? "",
    );
    const [stock, setStock] = useState(String(product?.stock ?? 0));
    const [shippingWeightGrams, setShippingWeightGrams] = useState(
        String(product?.shippingWeightGrams ?? 0),
    );
    const [imageFile, setImageFile] = useState<File | null>(null);
    const [previewUrl, setPreviewUrl] = useState(product?.imageUrl ?? "");
    const [formError, setFormError] = useState<string | null>(null);
    const firstPrice = product?.priceOptions[0]?.priceInCents;

    return (
        <form
            className="grid grid-cols-1 items-start gap-8 lg:grid-cols-3"
            onSubmit={(event) => {
                event.preventDefault();

                if (!product && !imageFile) {
                    setFormError("Informe uma imagem para cadastrar.");
                    return;
                }

                if (
                    !name ||
                    !lineUuid ||
                    !shortDescription ||
                    !longDescription
                ) {
                    setFormError("Preencha nome, linha e descrições.");
                    return;
                }

                if (category === "ARTISANAL") {
                    const numericStock = Number(stock);
                    const numericWeight = Number(shippingWeightGrams);

                    if (numericStock < 0 || numericWeight <= 0) {
                        setFormError("Informe estoque e peso válidos.");
                        return;
                    }
                }

                setFormError(null);

                const payload: ProductFormPayload = {
                    name,
                    category,
                    lineUuid,
                    shortDescription,
                    longDescription,
                    description: longDescription || shortDescription,
                    ...(imageFile ? { image: imageFile } : {}),
                };

                if (category === "ARTISANAL") {
                    payload.stock = Number(stock);
                    payload.shippingWeightGrams = Number(shippingWeightGrams);
                }

                void onSubmit(payload);
            }}
        >
            <div className="space-y-6 lg:col-span-2">
                <section className="rounded-xl border border-slate-100 bg-white p-6 shadow-sm">
                    <h3 className="mb-6 text-sm font-bold uppercase tracking-wider text-slate-400">
                        Informações Gerais
                    </h3>
                    <div className="space-y-4">
                        <Field label="Nome do Produto">
                            <input
                                className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2.5 text-sm outline-none focus:border-primary focus:ring-2 focus:ring-primary/20"
                                onChange={(event) =>
                                    setName(event.target.value)
                                }
                                placeholder="Ex: Vela de Lavanda com Florais"
                                value={name}
                            />
                        </Field>
                        <Field label="Descrição curta">
                            <input
                                className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2.5 text-sm outline-none focus:border-primary focus:ring-2 focus:ring-primary/20"
                                onChange={(event) =>
                                    setShortDescription(event.target.value)
                                }
                                placeholder="Resumo para vitrines e cartões"
                                value={shortDescription}
                            />
                        </Field>
                        <Field label="Descrição">
                            <div className="overflow-hidden rounded-lg border border-slate-200">
                                <div className="flex gap-2 border-b border-slate-200 bg-slate-50 p-2">
                                    {[
                                        "format_bold",
                                        "format_italic",
                                        "format_list_bulleted",
                                        "link",
                                    ].map((icon) => (
                                        <button
                                            className="rounded p-1 text-slate-500 hover:bg-white"
                                            key={icon}
                                            type="button"
                                        >
                                            <span className="material-symbols-outlined text-sm">
                                                {icon}
                                            </span>
                                        </button>
                                    ))}
                                </div>
                                <textarea
                                    className="min-h-40 w-full border-0 px-3 py-3 text-sm outline-none focus:ring-0"
                                    onChange={(event) =>
                                        setLongDescription(event.target.value)
                                    }
                                    placeholder="Descreva os benefícios e a arte por trás deste produto..."
                                    value={longDescription}
                                />
                            </div>
                        </Field>
                    </div>
                </section>

                <section className="rounded-xl border border-slate-100 bg-white p-6 shadow-sm">
                    <h3 className="mb-6 text-sm font-bold uppercase tracking-wider text-slate-400">
                        Preços e Estoque
                    </h3>
                    <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                        <div className="rounded-lg border border-slate-100 bg-slate-50 p-4">
                            <Field label="Preço base">
                                <input
                                    className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2.5 text-sm text-slate-500 outline-none"
                                    disabled
                                    value={
                                        firstPrice
                                            ? formatCurrency(firstPrice)
                                            : "Definido pela linha"
                                    }
                                />
                            </Field>
                        </div>
                        <div className="rounded-lg border border-blue-100 bg-blue-50/30 p-4">
                            <Field label="SKU">
                                <input
                                    className="w-full rounded-lg border border-blue-100 bg-white px-3 py-2.5 text-sm text-slate-500 outline-none"
                                    disabled
                                    value={product?.slug ?? "Gerado ao salvar"}
                                />
                            </Field>
                        </div>
                        <Field label="Estoque">
                            <input
                                className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2.5 text-sm outline-none disabled:bg-slate-100 disabled:text-slate-400"
                                disabled={category !== "ARTISANAL"}
                                min="0"
                                onChange={(event) =>
                                    setStock(event.target.value)
                                }
                                type="number"
                                value={stock}
                            />
                        </Field>
                        <Field label="Peso para frete (gramas)">
                            <input
                                className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2.5 text-sm outline-none disabled:bg-slate-100 disabled:text-slate-400"
                                disabled={category !== "ARTISANAL"}
                                min="1"
                                onChange={(event) =>
                                    setShippingWeightGrams(event.target.value)
                                }
                                type="number"
                                value={shippingWeightGrams}
                            />
                        </Field>
                    </div>
                </section>

                <section className="rounded-xl border border-slate-100 bg-white p-6 shadow-sm">
                    <h3 className="mb-6 text-sm font-bold uppercase tracking-wider text-slate-400">
                        Imagem do Produto
                    </h3>
                    <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
                        <label className="flex aspect-square cursor-pointer flex-col items-center justify-center gap-2 rounded-xl border-2 border-dashed border-slate-200 text-slate-500 transition hover:border-primary hover:bg-blue-50 hover:text-primary">
                            <span className="material-symbols-outlined">
                                add_a_photo
                            </span>
                            <span className="text-[10px] font-bold uppercase">
                                Upload
                            </span>
                            <input
                                accept="image/png,image/jpeg,image/webp"
                                className="sr-only"
                                onChange={(event) => {
                                    const file = event.target.files?.[0];
                                    if (!file) return;

                                    if (file.size > 5 * 1024 * 1024) {
                                        setFormError(
                                            "Imagem deve ter no máximo 5 MB.",
                                        );
                                        return;
                                    }

                                    setFormError(null);
                                    setImageFile(file);
                                    if (previewUrl.startsWith("blob:")) {
                                        URL.revokeObjectURL(previewUrl);
                                    }
                                    setPreviewUrl(URL.createObjectURL(file));
                                }}
                                type="file"
                            />
                        </label>
                        {previewUrl ? (
                            <div className="group relative aspect-square overflow-hidden rounded-xl bg-slate-100">
                                <div
                                    aria-label="Prévia do produto"
                                    className="h-full w-full bg-cover bg-center"
                                    role="img"
                                    style={{
                                        backgroundImage: `url(${previewUrl})`,
                                    }}
                                />
                                <div className="absolute inset-0 flex items-center justify-center bg-black/40 opacity-0 transition-opacity group-hover:opacity-100">
                                    <button
                                        className="rounded-full bg-white p-2 text-red-500 shadow-lg"
                                        onClick={() => {
                                            setImageFile(null);
                                            if (
                                                previewUrl.startsWith("blob:")
                                            ) {
                                                URL.revokeObjectURL(previewUrl);
                                            }
                                            setPreviewUrl("");
                                        }}
                                        type="button"
                                    >
                                        <span className="material-symbols-outlined text-sm">
                                            delete
                                        </span>
                                    </button>
                                </div>
                            </div>
                        ) : null}
                    </div>
                </section>
            </div>

            <div className="space-y-6">
                <section className="rounded-xl border border-slate-100 bg-white p-6 shadow-sm">
                    <h3 className="mb-6 text-sm font-bold uppercase tracking-wider text-slate-400">
                        Status e Tipo
                    </h3>
                    <div className="space-y-6">
                        <div>
                            <span className="mb-3 block text-xs font-bold text-slate-600">
                                Status do Produto
                            </span>
                            <span className="inline-flex items-center gap-3">
                                <span className="relative inline-flex h-6 w-11 rounded-full bg-primary">
                                    <span className="absolute right-0.5 top-0.5 size-5 rounded-full bg-white" />
                                </span>
                                <span className="text-sm font-medium text-slate-700">
                                    {product?.isActive === false
                                        ? "Inativo"
                                        : "Ativo"}
                                </span>
                            </span>
                        </div>
                        <div className="h-px bg-slate-100" />
                        <div>
                            <span className="mb-3 block text-xs font-bold text-slate-600">
                                Tipo de Produto
                            </span>
                            <div className="space-y-2">
                                <CategoryOption
                                    checked={category === "ARTISANAL"}
                                    description="Item físico com estoque e frete"
                                    label="Artesanato"
                                    onChange={() => setCategory("ARTISANAL")}
                                />
                                <CategoryOption
                                    checked={category === "SELFCARE"}
                                    description="Linha de beleza sem estoque manual"
                                    label="Beleza Natural"
                                    onChange={() => setCategory("SELFCARE")}
                                />
                            </div>
                        </div>
                    </div>
                </section>

                <section className="rounded-xl border border-slate-100 bg-white p-6 shadow-sm">
                    <h3 className="mb-6 text-sm font-bold uppercase tracking-wider text-slate-400">
                        Classificação
                    </h3>
                    <Field label="Linha">
                        <select
                            className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2.5 text-sm outline-none focus:border-primary focus:ring-2 focus:ring-primary/20"
                            onChange={(event) =>
                                setLineUuid(event.target.value)
                            }
                            value={lineUuid}
                        >
                            {lines.map((line) => (
                                <option key={line.uuid} value={line.uuid}>
                                    {line.name}
                                </option>
                            ))}
                        </select>
                    </Field>
                </section>

                {formError || feedback ? (
                    <p className="rounded-lg border border-slate-200 bg-white px-4 py-3 text-sm text-slate-600">
                        {formError ?? feedback}
                    </p>
                ) : null}

                <div className="space-y-3 pt-2">
                    <button
                        className="flex w-full items-center justify-center gap-2 rounded-xl bg-primary py-4 font-bold text-white shadow-lg shadow-blue-200 transition hover:brightness-110"
                        type="submit"
                    >
                        <span className="material-symbols-outlined text-sm">
                            save
                        </span>
                        {product ? "Salvar Produto" : "Cadastrar Produto"}
                    </button>
                    <Link
                        className="block w-full rounded-xl border border-slate-200 bg-white py-4 text-center font-bold text-slate-500 transition hover:bg-slate-50"
                        href="/admin/produtos"
                    >
                        Cancelar
                    </Link>
                </div>
            </div>
        </form>
    );
}

function Field({
    label,
    children,
}: {
    label: string;
    children: React.ReactNode;
}) {
    return (
        <label className="block">
            <span className="mb-1 block text-xs font-bold text-slate-600">
                {label}
            </span>
            {children}
        </label>
    );
}

function CategoryOption({
    checked,
    label,
    description,
    onChange,
}: {
    checked: boolean;
    label: string;
    description: string;
    onChange: () => void;
}) {
    return (
        <label className="flex cursor-pointer items-center rounded-lg border border-slate-200 p-3 transition hover:border-primary">
            <input
                checked={checked}
                className="text-primary focus:ring-primary"
                name="product_category"
                onChange={onChange}
                type="radio"
            />
            <span className="ml-3">
                <span className="block text-sm font-bold text-slate-800">
                    {label}
                </span>
                <span className="block text-[10px] text-slate-500">
                    {description}
                </span>
            </span>
        </label>
    );
}
