"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { FeedbackDialog } from "@/components/shared/feedback-dialog";
import { ProductImage } from "@/components/shared/product-image";
import { useApiToken } from "@/hooks/use-api-token";
import { useProductLines } from "@/hooks/use-products";
import { createProduct, updateProduct } from "@/lib/api";
import type {
    CreateProductInput,
    Product,
    ProductCategory,
    ProductLine,
    UpdateProductInput,
} from "@/lib/types";
import { formatCurrency, getLowestPriceOption } from "@/lib/utils";

type AdminProductEditorClientProps = {
    initialLines: ProductLine[];
    initialProduct?: Product | null;
    loadError?: string | null;
    notFound?: boolean;
    productUuid?: string;
};

type ProductFormPayload = CreateProductInput | UpdateProductInput;
type Feedback = { title: string; description: string; returnToList?: boolean };

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
    initialLines,
    initialProduct = null,
    loadError = null,
    notFound = false,
    productUuid,
}: AdminProductEditorClientProps) {
    const router = useRouter();
    const token = useApiToken();
    const lines = useProductLines(initialLines);
    const [feedback, setFeedback] = useState<Feedback | null>(null);
    const [isLoadErrorDismissed, setIsLoadErrorDismissed] = useState(false);
    const isEditing = Boolean(productUuid);

    async function saveProduct(payload: ProductFormPayload) {
        if (!token) {
            setFeedback({
                title: "Sessão necessária",
                description: "Entre novamente para salvar o produto.",
            });
            return false;
        }

        try {
            if (initialProduct) {
                await updateProduct(token, initialProduct.uuid, payload);
                setFeedback({
                    title: "Produto atualizado",
                    description: "As vitrines já usam os dados salvos.",
                    returnToList: true,
                });
                return true;
            }

            if (!isCreateProductPayload(payload)) {
                setFeedback({
                    title: "Cadastro incompleto",
                    description:
                        "Informe imagem, nome, linha e descrições antes de cadastrar.",
                });
                return false;
            }

            await createProduct(token, payload);
            setFeedback({
                title: "Produto cadastrado",
                description:
                    "O produto foi salvo e já pode aparecer na vitrine.",
                returnToList: true,
            });
            return true;
        } catch (error) {
            setFeedback({
                title: "Não foi possível salvar",
                description:
                    error instanceof Error
                        ? error.message
                        : "Revise os dados e tente novamente.",
            });
            return false;
        }
    }

    const resolvedLoadError = loadError ?? lines.error;

    return (
        <div className="flex flex-col">
            <AdminProductTopbar
                title={isEditing ? "Editar Produto" : "Cadastrar Novo Produto"}
            />
            <div className="mx-auto w-full max-w-6xl p-4 md:p-8">
                <div className="mb-8">
                    <div>
                        <p className="text-sm font-bold text-primary">
                            Catálogo
                        </p>
                        <h1 className="mt-1 text-3xl font-extrabold tracking-tight text-slate-900">
                            {isEditing ? "Editar produto" : "Adicionar produto"}
                        </h1>
                    </div>
                </div>

                {(!isEditing || initialProduct) && lines.data.length ? (
                    <ProductForm
                        key={initialProduct?.uuid ?? "new"}
                        lines={lines.data}
                        onSubmit={saveProduct}
                        product={initialProduct}
                    />
                ) : null}
            </div>

            <FeedbackDialog
                confirmLabel="Voltar para produtos"
                description={
                    resolvedLoadError ??
                    (notFound
                        ? "Este produto não existe ou não está mais disponível."
                        : "Não foi possível abrir este produto.")
                }
                onConfirm={() => router.push("/admin/produtos")}
                onOpenChange={(open) => setIsLoadErrorDismissed(!open)}
                open={
                    Boolean(
                        resolvedLoadError ||
                        (isEditing && !initialProduct) ||
                        !lines.data.length,
                    ) && !isLoadErrorDismissed
                }
                title={
                    notFound ? "Produto não encontrado" : "Dados indisponíveis"
                }
            />
            <FeedbackDialog
                description={feedback?.description ?? ""}
                onConfirm={() => {
                    if (feedback?.returnToList) {
                        router.push("/admin/produtos");
                    }
                }}
                onOpenChange={(open) => {
                    if (!open) {
                        if (feedback?.returnToList) {
                            router.push("/admin/produtos");
                        }
                        setFeedback(null);
                    }
                }}
                open={Boolean(feedback)}
                title={feedback?.title ?? "Aviso"}
            />
        </div>
    );
}

function AdminProductTopbar({ title }: { title: string }) {
    return (
        <header className="sticky top-0 z-10 flex min-h-16 items-center border-b border-slate-200 bg-white px-4 py-3 md:px-8">
            <h2 className="truncate text-lg font-extrabold tracking-tight text-slate-900 md:text-xl">
                {title}
            </h2>
        </header>
    );
}

function ProductForm({
    product,
    lines,
    onSubmit,
}: {
    product: Product | null;
    lines: ProductLine[];
    onSubmit: (payload: ProductFormPayload) => Promise<boolean>;
}) {
    const router = useRouter();
    const initialName = product?.name ?? "";
    const initialLineUuid = product?.line.uuid ?? lines[0]?.uuid ?? "";
    const initialCategory = product?.category ?? "ARTISANAL";
    const initialShortDescription = product?.shortDescription ?? "";
    const initialLongDescription = product?.longDescription ?? "";
    const initialStock = String(product?.stock ?? 0);
    const initialWeight = String(product?.shippingWeightGrams ?? 0);
    const initialIsActive = product?.isActive ?? true;
    const initialSnapshot = JSON.stringify({
        name: initialName,
        lineUuid: initialLineUuid,
        category: initialCategory,
        shortDescription: initialShortDescription,
        longDescription: initialLongDescription,
        stock: initialStock,
        shippingWeightGrams: initialWeight,
        image: null,
        removeImage: false,
        isActive: initialIsActive,
    });
    const [name, setName] = useState(initialName);
    const [lineUuid, setLineUuid] = useState(initialLineUuid);
    const [category, setCategory] = useState<ProductCategory>(initialCategory);
    const [shortDescription, setShortDescription] = useState(
        initialShortDescription,
    );
    const [longDescription, setLongDescription] = useState(
        initialLongDescription,
    );
    const [stock, setStock] = useState(initialStock);
    const [shippingWeightGrams, setShippingWeightGrams] =
        useState(initialWeight);
    const [imageFile, setImageFile] = useState<File | null>(null);
    const [previewUrl, setPreviewUrl] = useState(product?.imageUrl ?? "");
    const [removeSavedImage, setRemoveSavedImage] = useState(false);
    const [isActive, setIsActive] = useState(initialIsActive);
    const [validationError, setValidationError] = useState<string | null>(null);
    const [pendingPayload, setPendingPayload] =
        useState<ProductFormPayload | null>(null);
    const [isExitDialogOpen, setIsExitDialogOpen] = useState(false);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [savedSnapshot, setSavedSnapshot] = useState(initialSnapshot);
    const currentSnapshot = JSON.stringify({
        name,
        lineUuid,
        category,
        shortDescription,
        longDescription,
        stock,
        shippingWeightGrams,
        image: imageFile
            ? `${imageFile.name}:${imageFile.size}:${imageFile.lastModified}`
            : null,
        removeImage: removeSavedImage,
        isActive,
    });
    const isDirty = currentSnapshot !== savedSnapshot;
    const selectedLine = lines.find((line) => line.uuid === lineUuid);
    const productPrice = getLowestPriceOption(product?.priceOptions ?? []);
    const selectedLinePrice = Math.min(
        selectedLine?.price70gInCents ?? Number.POSITIVE_INFINITY,
        selectedLine?.price100gInCents ?? Number.POSITIVE_INFINITY,
    );
    const previewPriceInCents =
        lineUuid === product?.line.uuid
            ? (productPrice?.priceInCents ?? selectedLinePrice)
            : selectedLinePrice;

    useEffect(() => {
        function warnBeforeUnload(event: BeforeUnloadEvent) {
            if (!isDirty) return;
            event.preventDefault();
        }

        window.addEventListener("beforeunload", warnBeforeUnload);
        return () =>
            window.removeEventListener("beforeunload", warnBeforeUnload);
    }, [isDirty]);

    useEffect(
        () => () => {
            if (previewUrl.startsWith("blob:")) URL.revokeObjectURL(previewUrl);
        },
        [previewUrl],
    );

    function buildPayload() {
        const trimmedName = name.trim();
        const trimmedShortDescription = shortDescription.trim();
        const trimmedLongDescription = longDescription.trim();

        if (!product && !imageFile) {
            setValidationError("Escolha uma imagem para cadastrar o produto.");
            return null;
        }

        if (
            !trimmedName ||
            !trimmedShortDescription ||
            !trimmedLongDescription
        ) {
            setValidationError(
                "Preencha nome, descrição curta e descrição completa.",
            );
            return null;
        }

        if (!lineUuid || !lines.some((line) => line.uuid === lineUuid)) {
            setValidationError("Escolha uma linha de produto válida.");
            return null;
        }

        const payload: ProductFormPayload = {
            name: trimmedName,
            category,
            lineUuid,
            shortDescription: trimmedShortDescription,
            longDescription: trimmedLongDescription,
            description: trimmedLongDescription,
            ...(imageFile ? { image: imageFile } : {}),
            ...(product
                ? {
                      isActive,
                      ...(removeSavedImage ? { removeImage: true } : {}),
                  }
                : {}),
        };

        if (category === "ARTISANAL") {
            const numericStock = Number(stock);
            const numericWeight = Number(shippingWeightGrams);

            if (
                !stock.trim() ||
                !Number.isFinite(numericStock) ||
                !Number.isInteger(numericStock) ||
                numericStock < 0
            ) {
                setValidationError(
                    "Informe um estoque inteiro igual ou maior que zero.",
                );
                return null;
            }

            if (
                !shippingWeightGrams.trim() ||
                !Number.isFinite(numericWeight) ||
                !Number.isInteger(numericWeight) ||
                numericWeight <= 0
            ) {
                setValidationError("Informe um peso inteiro maior que zero.");
                return null;
            }

            payload.stock = numericStock;
            payload.shippingWeightGrams = numericWeight;
        }

        return payload;
    }

    async function submitPayload(payload: ProductFormPayload) {
        if (isSubmitting) return;

        try {
            setIsSubmitting(true);
            const saved = await onSubmit(payload);
            if (saved) setSavedSnapshot(currentSnapshot);
        } finally {
            setIsSubmitting(false);
            setPendingPayload(null);
        }
    }

    function requestExit() {
        if (isDirty) {
            setIsExitDialogOpen(true);
            return;
        }

        router.push("/admin/produtos");
    }

    return (
        <>
            <form
                className="grid grid-cols-1 items-start gap-8 lg:grid-cols-3"
                onSubmit={(event) => {
                    event.preventDefault();
                    if (isSubmitting) return;

                    const payload = buildPayload();
                    if (!payload) return;

                    const changesStructure = Boolean(
                        product &&
                        (category !== product.category ||
                            lineUuid !== product.line.uuid),
                    );

                    if (changesStructure) {
                        setPendingPayload(payload);
                        return;
                    }

                    void submitPayload(payload);
                }}
            >
                <div className="space-y-6 lg:col-span-2">
                    <section className="rounded-xl border border-slate-200 bg-white p-6">
                        <h3 className="mb-6 text-sm font-bold text-slate-700">
                            Informações gerais
                        </h3>
                        <div className="space-y-4">
                            <Field label="Nome do produto">
                                <input
                                    className="min-h-11 w-full rounded-lg border border-slate-200 bg-white px-3 py-2.5 text-base outline-none focus:border-primary focus:ring-2 focus:ring-primary/20"
                                    maxLength={160}
                                    onChange={(event) =>
                                        setName(event.target.value)
                                    }
                                    placeholder="Ex: Vela de Lavanda"
                                    value={name}
                                />
                            </Field>
                            <Field label="Descrição curta">
                                <input
                                    className="min-h-11 w-full rounded-lg border border-slate-200 bg-white px-3 py-2.5 text-base outline-none focus:border-primary focus:ring-2 focus:ring-primary/20"
                                    maxLength={240}
                                    onChange={(event) =>
                                        setShortDescription(event.target.value)
                                    }
                                    placeholder="Resumo usado na vitrine"
                                    value={shortDescription}
                                />
                            </Field>
                            <Field label="Descrição completa">
                                <textarea
                                    className="min-h-40 w-full rounded-lg border border-slate-200 px-3 py-3 text-base outline-none focus:border-primary focus:ring-2 focus:ring-primary/20"
                                    maxLength={4000}
                                    onChange={(event) =>
                                        setLongDescription(event.target.value)
                                    }
                                    placeholder="Descreva materiais, processo e cuidados reais."
                                    value={longDescription}
                                />
                            </Field>
                        </div>
                    </section>

                    <section className="rounded-xl border border-slate-200 bg-white p-6">
                        <h3 className="mb-6 text-sm font-bold text-slate-700">
                            Estoque e frete
                        </h3>
                        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                            <Field label="Estoque">
                                <input
                                    className="min-h-11 w-full rounded-lg border border-slate-200 bg-white px-3 py-2.5 text-base outline-none disabled:bg-slate-100 disabled:text-slate-500"
                                    disabled={category !== "ARTISANAL"}
                                    min="0"
                                    onChange={(event) =>
                                        setStock(event.target.value)
                                    }
                                    step="1"
                                    type="number"
                                    value={stock}
                                />
                            </Field>
                            <Field label="Peso para frete (gramas)">
                                <input
                                    className="min-h-11 w-full rounded-lg border border-slate-200 bg-white px-3 py-2.5 text-base outline-none disabled:bg-slate-100 disabled:text-slate-500"
                                    disabled={category !== "ARTISANAL"}
                                    min="1"
                                    onChange={(event) =>
                                        setShippingWeightGrams(
                                            event.target.value,
                                        )
                                    }
                                    step="1"
                                    type="number"
                                    value={shippingWeightGrams}
                                />
                            </Field>
                        </div>
                    </section>

                    <section className="rounded-xl border border-slate-200 bg-white p-6">
                        <h3 className="mb-2 text-sm font-bold text-slate-700">
                            Imagem do produto
                        </h3>
                        <p className="mb-5 text-sm text-slate-500">
                            Substitua a imagem ou remova a imagem salva.
                            Produtos sem imagem usam o fallback da vitrine.
                        </p>
                        <label className="flex min-h-28 cursor-pointer flex-col items-center justify-center gap-2 rounded-xl border-2 border-dashed border-slate-200 text-blue-800 transition hover:border-primary hover:bg-blue-50 hover:text-primary">
                            <span
                                aria-hidden="true"
                                className="material-symbols-outlined"
                            >
                                add_a_photo
                            </span>
                            <span className="text-sm font-bold">
                                {product
                                    ? "Substituir imagem"
                                    : "Escolher imagem"}
                            </span>
                            <span className="text-xs">
                                JPG, PNG ou WebP, até 5 MB
                            </span>
                            <input
                                accept="image/png,image/jpeg,image/webp"
                                className="sr-only"
                                onChange={(event) => {
                                    const file = event.target.files?.[0];
                                    if (!file) return;

                                    if (file.size > 5 * 1024 * 1024) {
                                        setValidationError(
                                            "A imagem deve ter no máximo 5 MB.",
                                        );
                                        return;
                                    }

                                    if (
                                        ![
                                            "image/jpeg",
                                            "image/png",
                                            "image/webp",
                                        ].includes(file.type)
                                    ) {
                                        setValidationError(
                                            "Escolha uma imagem JPG, PNG ou WebP.",
                                        );
                                        return;
                                    }

                                    setImageFile(file);
                                    setRemoveSavedImage(false);
                                    setPreviewUrl(URL.createObjectURL(file));
                                }}
                                type="file"
                            />
                        </label>
                        {imageFile ? (
                            <button
                                className="mt-3 min-h-11 rounded-lg border border-slate-200 px-4 py-2 text-sm font-bold text-slate-700 hover:bg-slate-50"
                                onClick={() => {
                                    setImageFile(null);
                                    setRemoveSavedImage(false);
                                    setPreviewUrl(product?.imageUrl ?? "");
                                }}
                                type="button"
                            >
                                Descartar imagem escolhida
                            </button>
                        ) : null}
                        {product?.imageUrl && !imageFile ? (
                            <button
                                className="mt-3 min-h-11 rounded-lg border border-red-200 px-4 py-2 text-sm font-bold text-red-700 hover:bg-red-50"
                                onClick={() => {
                                    setRemoveSavedImage((current) => !current);
                                    setPreviewUrl(
                                        removeSavedImage
                                            ? (product.imageUrl ?? "")
                                            : "",
                                    );
                                }}
                                type="button"
                            >
                                {removeSavedImage
                                    ? "Manter imagem salva"
                                    : "Remover imagem salva"}
                            </button>
                        ) : null}
                    </section>
                </div>

                <div className="space-y-6">
                    <section className="rounded-xl border border-slate-200 bg-white p-6">
                        <h3 className="mb-6 text-sm font-bold text-slate-700">
                            Tipo e linha
                        </h3>
                        <div className="space-y-2">
                            <CategoryOption
                                checked={category === "ARTISANAL"}
                                description="Item com estoque e peso de frete"
                                label="Artesanato"
                                onChange={() => setCategory("ARTISANAL")}
                            />
                            <CategoryOption
                                checked={category === "SELFCARE"}
                                description="Produto sem estoque manual"
                                label="Beleza Natural"
                                onChange={() => setCategory("SELFCARE")}
                            />
                        </div>
                        <div className="mt-5">
                            <Field label="Linha">
                                <select
                                    className="min-h-11 w-full rounded-lg border border-slate-200 bg-white px-3 py-2.5 text-base outline-none focus:border-primary focus:ring-2 focus:ring-primary/20"
                                    onChange={(event) =>
                                        setLineUuid(event.target.value)
                                    }
                                    value={lineUuid}
                                >
                                    {lines.map((line) => (
                                        <option
                                            key={line.uuid}
                                            value={line.uuid}
                                        >
                                            {line.name}
                                        </option>
                                    ))}
                                </select>
                            </Field>
                        </div>
                        {product ? (
                            <label className="mt-5 flex items-start gap-3 rounded-lg bg-slate-50 p-4">
                                <input
                                    checked={isActive}
                                    className="mt-1 size-4 accent-primary"
                                    onChange={(event) =>
                                        setIsActive(event.target.checked)
                                    }
                                    type="checkbox"
                                />
                                <span>
                                    <span className="block text-sm font-bold text-slate-900">
                                        Produto ativo na vitrine
                                    </span>
                                </span>
                            </label>
                        ) : null}
                    </section>

                    <ProductCardPreview
                        category={category}
                        description={shortDescription}
                        imageUrl={previewUrl}
                        lineName={selectedLine?.name ?? "Linha"}
                        name={name}
                        priceInCents={previewPriceInCents}
                    />

                    <div className="space-y-3 pt-2">
                        {isDirty ? (
                            <p className="text-center text-sm font-medium text-amber-800">
                                Alterações ainda não salvas
                            </p>
                        ) : null}
                        <button
                            aria-busy={isSubmitting}
                            className="flex min-h-12 w-full items-center justify-center gap-2 rounded-xl bg-primary px-4 py-3 font-bold text-white transition hover:bg-primary/90 disabled:cursor-not-allowed disabled:opacity-60"
                            disabled={isSubmitting || !isDirty}
                            type="submit"
                        >
                            <span
                                aria-hidden="true"
                                className="material-symbols-outlined text-sm"
                            >
                                save
                            </span>
                            {isSubmitting
                                ? "Salvando"
                                : product
                                  ? "Salvar produto"
                                  : "Cadastrar produto"}
                        </button>
                        <button
                            className="min-h-12 w-full rounded-xl border border-slate-200 bg-white px-4 py-3 font-bold text-slate-600 hover:bg-slate-50"
                            onClick={requestExit}
                            type="button"
                        >
                            Cancelar
                        </button>
                    </div>
                </div>
            </form>

            <FeedbackDialog
                description={validationError ?? ""}
                onOpenChange={(open) => {
                    if (!open) setValidationError(null);
                }}
                open={Boolean(validationError)}
                title="Revise o formulário"
            />
            <FeedbackDialog
                confirmLabel="Salvar alterações"
                description="Tipo ou linha foram alterados. Isso muda estoque, frete e preços exibidos na vitrine. Confirme somente após revisar a prévia."
                onConfirm={() => {
                    if (pendingPayload) void submitPayload(pendingPayload);
                }}
                onOpenChange={(open) => {
                    if (!open && !isSubmitting) setPendingPayload(null);
                }}
                open={Boolean(pendingPayload)}
                secondaryLabel="Revisar"
                title="Confirmar mudança estrutural?"
            />
            <FeedbackDialog
                confirmLabel="Descartar alterações"
                description="As alterações feitas desde o último salvamento serão perdidas."
                onConfirm={() => router.push("/admin/produtos")}
                onOpenChange={setIsExitDialogOpen}
                open={isExitDialogOpen}
                secondaryLabel="Continuar editando"
                title="Sair sem salvar?"
            />
        </>
    );
}

function ProductCardPreview({
    category,
    description,
    imageUrl,
    lineName,
    name,
    priceInCents,
}: {
    category: ProductCategory;
    description: string;
    imageUrl: string;
    lineName: string;
    name: string;
    priceInCents: number;
}) {
    const isCraft = category === "ARTISANAL";
    const hasPrice = Number.isFinite(priceInCents) && priceInCents > 0;

    return (
        <section className="rounded-xl border border-slate-200 bg-white p-5">
            <h3 className="mb-4 text-sm font-bold text-slate-700">
                Prévia da vitrine
            </h3>
            <article className="flex flex-col">
                <div
                    className={`relative mb-4 overflow-hidden bg-slate-100 ${isCraft ? "aspect-[4/5] rounded-lg" : "aspect-square rounded-xl"}`}
                >
                    <ProductImage
                        alt={name.trim() || "Prévia do produto"}
                        className="h-full w-full object-cover"
                        sizes="320px"
                        src={imageUrl}
                        unoptimized={imageUrl.startsWith("blob:")}
                    />
                    <span className="absolute bottom-3 left-3 rounded bg-white/90 px-2 py-1 text-xs font-bold uppercase tracking-wider text-primary">
                        {lineName}
                    </span>
                </div>
                <h4
                    className={
                        isCraft
                            ? "text-lg font-medium text-slate-900"
                            : "font-display text-lg font-bold text-slate-900"
                    }
                >
                    {name.trim() || "Nome do produto"}
                </h4>
                <p className="mt-1 line-clamp-2 min-h-10 text-sm leading-5 text-slate-600">
                    {description.trim() || "A descrição curta aparecerá aqui."}
                </p>
                <div className="mt-4 flex items-end justify-between gap-3">
                    <span className="font-bold text-slate-900">
                        {hasPrice
                            ? formatCurrency(priceInCents)
                            : "Sob consulta"}
                    </span>
                    <span className="rounded-lg bg-primary px-3 py-2 text-xs font-bold text-white">
                        {isCraft ? "Ver detalhes" : "Escolher tamanho"}
                    </span>
                </div>
            </article>
        </section>
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
            <span className="mb-1 block text-sm font-bold text-slate-700">
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
        <label className="flex min-h-16 cursor-pointer items-center rounded-lg border border-slate-200 p-3 transition hover:border-primary">
            <input
                checked={checked}
                className="text-primary focus:ring-primary"
                name="product_category"
                onChange={onChange}
                type="radio"
            />
            <span className="ml-3 min-w-0">
                <span className="block text-sm font-bold text-slate-800">
                    {label}
                </span>
                <span className="block text-xs text-slate-500">
                    {description}
                </span>
            </span>
        </label>
    );
}
