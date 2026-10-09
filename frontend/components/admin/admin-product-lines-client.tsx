"use client";

import { FormEvent, useMemo, useState } from "react";
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog";
import { FeedbackDialog } from "@/components/shared/feedback-dialog";
import { useApiToken } from "@/hooks/use-api-token";
import {
    createProductLine,
    getProductLines,
    updateProductLine,
} from "@/lib/api";
import type { ProductLine, ProductLineInput } from "@/lib/types";
import { formatCurrency } from "@/lib/utils";

type AdminProductLinesClientProps = {
    initialLines: ProductLine[];
};

type Feedback = { title: string; description: string };

type LineForm = {
    name: string;
    price70g: string;
    price100g: string;
};

const emptyForm: LineForm = {
    name: "",
    price70g: "",
    price100g: "",
};

function centsToInput(value: number) {
    return (value / 100).toFixed(2);
}

function parsePrice(value: string) {
    const normalized = value.trim().replace(",", ".");
    const price = Number(normalized);
    return Number.isFinite(price) ? Math.round(price * 100) : Number.NaN;
}

export function AdminProductLinesClient({
    initialLines,
}: AdminProductLinesClientProps) {
    const token = useApiToken();
    const [lines, setLines] = useState(initialLines);
    const [search, setSearch] = useState("");
    const [editorOpen, setEditorOpen] = useState(false);
    const [editingLine, setEditingLine] = useState<ProductLine | null>(null);
    const [form, setForm] = useState<LineForm>(emptyForm);
    const [isSaving, setIsSaving] = useState(false);
    const [feedback, setFeedback] = useState<Feedback | null>(null);

    const visibleLines = useMemo(() => {
        const query = search.trim().toLocaleLowerCase("pt-BR");
        if (!query) return lines;
        return lines.filter((line) =>
            line.name.toLocaleLowerCase("pt-BR").includes(query),
        );
    }, [lines, search]);

    function openCreate() {
        setEditingLine(null);
        setForm(emptyForm);
        setEditorOpen(true);
    }

    function openEdit(line: ProductLine) {
        setEditingLine(line);
        setForm({
            name: line.name,
            price70g: centsToInput(line.price70gInCents),
            price100g: centsToInput(line.price100gInCents),
        });
        setEditorOpen(true);
    }

    async function refreshLines() {
        const response = await getProductLines();
        setLines(response.lines);
    }

    async function handleSubmit(event: FormEvent<HTMLFormElement>) {
        event.preventDefault();

        const payload: ProductLineInput = {
            name: form.name.trim(),
            price70gInCents: parsePrice(form.price70g),
            price100gInCents: parsePrice(form.price100g),
        };

        if (
            !payload.name ||
            !Number.isInteger(payload.price70gInCents) ||
            !Number.isInteger(payload.price100gInCents) ||
            payload.price70gInCents <= 0 ||
            payload.price100gInCents <= 0
        ) {
            setFeedback({
                title: "Revise os dados da linha",
                description:
                    "Informe um nome e preços maiores que zero para os dois tamanhos.",
            });
            return;
        }

        if (!token) {
            setFeedback({
                title: "Sessão necessária",
                description: "Entre novamente para salvar esta linha.",
            });
            return;
        }

        try {
            setIsSaving(true);
            if (editingLine) {
                await updateProductLine(token, editingLine.uuid, payload);
            } else {
                await createProductLine(token, payload);
            }
            await refreshLines();
            setEditorOpen(false);
            setFeedback({
                title: editingLine ? "Linha atualizada" : "Linha criada",
                description: editingLine
                    ? "Nome e preços já estão atualizados no catálogo."
                    : "A nova linha já pode ser usada no cadastro de produtos.",
            });
        } catch (error) {
            setFeedback({
                title: "Não foi possível salvar a linha",
                description:
                    error instanceof Error ? error.message : "Tente novamente.",
            });
        } finally {
            setIsSaving(false);
        }
    }

    return (
        <div className="mx-auto w-full max-w-7xl p-4 md:p-8">
            <div className="mb-8 flex flex-col justify-between gap-4 md:flex-row md:items-end">
                <div className="max-w-2xl">
                    <h1 className="text-3xl font-bold text-slate-900">
                        Linhas e preços
                    </h1>
                    <p className="mt-2 text-slate-600">
                        Cada produto usa os preços da sua linha. Atualize os
                        dois tamanhos aqui para manter o catálogo coordenado.
                    </p>
                </div>
                <button
                    className="flex min-h-11 items-center justify-center gap-2 rounded-xl bg-primary px-6 py-3 font-bold text-white hover:bg-primary/90"
                    onClick={openCreate}
                    type="button"
                >
                    <span
                        aria-hidden="true"
                        className="material-symbols-outlined"
                    >
                        add
                    </span>
                    Nova linha
                </button>
            </div>

            <section className="overflow-hidden rounded-xl border border-slate-200 bg-white">
                <div className="flex flex-col gap-4 border-b border-slate-200 bg-slate-50/70 p-4 sm:flex-row sm:items-center sm:justify-between">
                    <div>
                        <h2 className="font-bold text-slate-900">
                            Tabela de preços do catálogo
                        </h2>
                        <p className="mt-1 text-sm text-slate-600">
                            {lines.length}{" "}
                            {lines.length === 1
                                ? "linha cadastrada"
                                : "linhas cadastradas"}
                        </p>
                    </div>
                    <label className="relative w-full sm:max-w-sm">
                        <span className="sr-only">Buscar linha pelo nome</span>
                        <span
                            aria-hidden="true"
                            className="material-symbols-outlined absolute top-1/2 left-3 -translate-y-1/2 text-slate-400"
                        >
                            search
                        </span>
                        <input
                            className="min-h-11 w-full rounded-lg border border-slate-200 bg-white py-2 pr-4 pl-10 text-base outline-none focus:ring-2 focus:ring-primary/30"
                            onChange={(event) => setSearch(event.target.value)}
                            placeholder="Buscar linha"
                            value={search}
                        />
                    </label>
                </div>

                <div className="hidden grid-cols-[minmax(12rem,1fr)_12rem_12rem_7rem] border-b border-slate-200 bg-white px-6 py-3 text-xs font-bold uppercase tracking-wider text-slate-500 md:grid">
                    <span>Linha</span>
                    <span>70 g</span>
                    <span>100 g</span>
                    <span className="text-right">Ação</span>
                </div>

                <div className="divide-y divide-slate-100">
                    {visibleLines.map((line) => (
                        <article
                            className="grid gap-5 p-5 transition-colors hover:bg-slate-50 md:grid-cols-[minmax(12rem,1fr)_12rem_12rem_7rem] md:items-center md:px-6"
                            key={line.uuid}
                        >
                            <div className="min-w-0">
                                <h3 className="truncate font-bold text-slate-900">
                                    {line.name}
                                </h3>
                                <p className="mt-1 truncate text-xs text-slate-500">
                                    {line.slug}
                                </p>
                            </div>
                            <PriceCell
                                grams="70 g"
                                value={line.price70gInCents}
                            />
                            <PriceCell
                                grams="100 g"
                                value={line.price100gInCents}
                            />
                            <button
                                aria-label={`Editar ${line.name}`}
                                className="flex min-h-11 items-center justify-center gap-2 rounded-lg border border-slate-200 px-3 text-sm font-bold text-slate-700 hover:border-primary/30 hover:bg-primary/5 hover:text-primary"
                                onClick={() => openEdit(line)}
                                type="button"
                            >
                                <span
                                    aria-hidden="true"
                                    className="material-symbols-outlined text-lg"
                                >
                                    edit
                                </span>
                                Editar
                            </button>
                        </article>
                    ))}
                </div>

                {!visibleLines.length ? (
                    <div className="px-6 py-14 text-center">
                        <span
                            aria-hidden="true"
                            className="material-symbols-outlined text-4xl text-slate-300"
                        >
                            sell
                        </span>
                        <p className="mt-3 font-bold text-slate-800">
                            {search
                                ? "Nenhuma linha corresponde à busca."
                                : "Nenhuma linha cadastrada."}
                        </p>
                        {!search ? (
                            <button
                                className="mt-4 min-h-11 rounded-lg bg-primary px-4 py-2 font-bold text-white"
                                onClick={openCreate}
                                type="button"
                            >
                                Criar primeira linha
                            </button>
                        ) : null}
                    </div>
                ) : null}
            </section>

            <Dialog
                open={editorOpen}
                onOpenChange={(open) => {
                    if (!isSaving) setEditorOpen(open);
                }}
            >
                <DialogContent className="max-w-xl rounded-xl bg-white p-0">
                    <DialogHeader className="border-b border-slate-200 px-6 py-5">
                        <DialogTitle className="text-2xl font-bold text-slate-950">
                            {editingLine ? "Editar linha" : "Nova linha"}
                        </DialogTitle>
                        <DialogDescription className="text-sm leading-6 text-slate-600">
                            O nome identifica o grupo; os preços serão usados
                            por todos os produtos vinculados a ele.
                        </DialogDescription>
                    </DialogHeader>
                    <form className="p-6" onSubmit={handleSubmit}>
                        <label className="block text-sm font-bold text-slate-700">
                            Nome da linha
                            <input
                                autoFocus
                                className="mt-2 min-h-11 w-full rounded-lg border border-slate-200 bg-white px-3 text-base font-normal outline-none focus:border-primary focus:ring-2 focus:ring-primary/20"
                                onChange={(event) =>
                                    setForm((current) => ({
                                        ...current,
                                        name: event.target.value,
                                    }))
                                }
                                placeholder="Ex.: Linha Tradicional"
                                value={form.name}
                            />
                        </label>

                        <fieldset className="mt-6">
                            <legend className="text-sm font-bold text-slate-700">
                                Preços por tamanho
                            </legend>
                            <div className="mt-2 grid gap-4 sm:grid-cols-2">
                                <PriceInput
                                    grams="70 g"
                                    onChange={(value) =>
                                        setForm((current) => ({
                                            ...current,
                                            price70g: value,
                                        }))
                                    }
                                    value={form.price70g}
                                />
                                <PriceInput
                                    grams="100 g"
                                    onChange={(value) =>
                                        setForm((current) => ({
                                            ...current,
                                            price100g: value,
                                        }))
                                    }
                                    value={form.price100g}
                                />
                            </div>
                        </fieldset>

                        <div className="mt-8 flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
                            <button
                                className="min-h-11 rounded-lg border border-slate-200 px-4 py-2 font-bold text-slate-700 hover:bg-slate-50 disabled:opacity-50"
                                disabled={isSaving}
                                onClick={() => setEditorOpen(false)}
                                type="button"
                            >
                                Cancelar
                            </button>
                            <button
                                className="min-h-11 rounded-lg bg-primary px-5 py-2 font-bold text-white hover:bg-primary/90 disabled:opacity-60"
                                disabled={isSaving}
                                type="submit"
                            >
                                {isSaving ? "Salvando..." : "Salvar linha"}
                            </button>
                        </div>
                    </form>
                </DialogContent>
            </Dialog>

            <FeedbackDialog
                description={feedback?.description ?? ""}
                onOpenChange={(open) => {
                    if (!open) setFeedback(null);
                }}
                open={Boolean(feedback)}
                title={feedback?.title ?? "Aviso"}
            />
        </div>
    );
}

function PriceCell({ grams, value }: { grams: string; value: number }) {
    return (
        <div>
            <p className="mb-1 text-xs font-bold uppercase tracking-wider text-slate-500 md:hidden">
                {grams}
            </p>
            <p className="text-lg font-bold tabular-nums text-primary">
                {formatCurrency(value)}
            </p>
        </div>
    );
}

function PriceInput({
    grams,
    onChange,
    value,
}: {
    grams: string;
    onChange: (value: string) => void;
    value: string;
}) {
    return (
        <label className="rounded-xl bg-slate-50 p-4 text-sm font-bold text-slate-700">
            {grams}
            <span className="relative mt-2 block">
                <span className="absolute top-1/2 left-3 -translate-y-1/2 font-normal text-slate-500">
                    R$
                </span>
                <input
                    className="min-h-11 w-full rounded-lg border border-slate-200 bg-white py-2 pr-3 pl-10 text-base font-semibold tabular-nums outline-none focus:border-primary focus:ring-2 focus:ring-primary/20"
                    inputMode="decimal"
                    onChange={(event) => onChange(event.target.value)}
                    placeholder="0,00"
                    value={value}
                />
            </span>
        </label>
    );
}
