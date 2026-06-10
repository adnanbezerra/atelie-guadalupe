"use client";

import type React from "react";
import { useState } from "react";
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog";
import type {
    CreateMarketingCouponInput,
    CreateMarketingPromotionInput,
    MarketingCoupon,
    MarketingPromotion,
    ProductCategory,
} from "@/lib/types";
import type { MarketingEditor } from "./types";
import { fromDatetimeLocal, inputClass, toDatetimeLocal } from "./utils";

type MarketingEditorDialogProps = {
    editor: MarketingEditor | null;
    isPending: boolean;
    onOpenChange: (open: boolean) => void;
    onSubmitCoupon: (payload: CreateMarketingCouponInput) => Promise<void>;
    onSubmitPromotion: (
        payload: CreateMarketingPromotionInput,
    ) => Promise<void>;
};

export function MarketingEditorDialog({
    editor,
    isPending,
    onOpenChange,
    onSubmitCoupon,
    onSubmitPromotion,
}: MarketingEditorDialogProps) {
    const title =
        editor?.kind === "promotion"
            ? editor.item
                ? "Editar promoção"
                : "Criar promoção"
            : editor?.item
              ? "Editar cupom"
              : "Criar cupom";
    const description =
        editor?.kind === "promotion"
            ? "Defina desconto, escopo e janela de validade da campanha."
            : "Defina código, limite de uso, segmentação e acúmulo com promoções.";

    return (
        <Dialog open={Boolean(editor)} onOpenChange={onOpenChange}>
            <DialogContent className="max-h-[90vh] max-w-2xl overflow-y-auto rounded-xl bg-slate-50">
                <DialogHeader className="border-b border-slate-200 bg-white p-6">
                    <DialogTitle className="font-display text-2xl font-bold text-slate-900">
                        {title}
                    </DialogTitle>
                    <DialogDescription className="text-sm leading-6 text-slate-500">
                        {description}
                    </DialogDescription>
                </DialogHeader>
                <div className="p-5">
                    {editor?.kind === "promotion" ? (
                        <PromotionForm
                            editing={editor.item ?? null}
                            isPending={isPending}
                            key={editor.item?.uuid ?? "new-promotion"}
                            onSubmit={onSubmitPromotion}
                        />
                    ) : null}
                    {editor?.kind === "coupon" ? (
                        <CouponForm
                            editing={editor.item ?? null}
                            isPending={isPending}
                            key={editor.item?.uuid ?? "new-coupon"}
                            onSubmit={onSubmitCoupon}
                        />
                    ) : null}
                </div>
            </DialogContent>
        </Dialog>
    );
}

function PromotionForm({
    editing,
    isPending,
    onSubmit,
}: {
    editing: MarketingPromotion | null;
    isPending: boolean;
    onSubmit: (payload: CreateMarketingPromotionInput) => Promise<void>;
}) {
    const [name, setName] = useState(editing?.name ?? "");
    const [scope, setScope] = useState<CreateMarketingPromotionInput["scope"]>(
        editing?.scope === "CATEGORY" ? "CATEGORY" : "ALL_PRODUCTS",
    );
    const [category, setCategory] = useState<ProductCategory>(
        editing?.category ?? "SELFCARE",
    );
    const [discountPercent, setDiscountPercent] = useState(
        String(editing?.discountPercent ?? 5),
    );
    const [startsAt, setStartsAt] = useState(
        toDatetimeLocal(editing?.startsAt ?? new Date().toISOString()),
    );
    const [endsAt, setEndsAt] = useState(
        toDatetimeLocal(editing?.endsAt ?? null),
    );
    const [isActive, setIsActive] = useState(editing?.isActive ?? true);

    return (
        <form
            className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm"
            onSubmit={async (event) => {
                event.preventDefault();
                const payload: CreateMarketingPromotionInput = {
                    name,
                    scope,
                    discountPercent: Number(discountPercent),
                    startsAt:
                        fromDatetimeLocal(startsAt) ?? new Date().toISOString(),
                    endsAt: fromDatetimeLocal(endsAt),
                    isActive,
                    ...(scope === "CATEGORY" ? { category } : {}),
                };

                await onSubmit(payload);
            }}
        >
            <Field label="Nome">
                <input
                    className={inputClass}
                    onChange={(event) => setName(event.target.value)}
                    required
                    value={name}
                />
            </Field>
            <div className="grid grid-cols-2 gap-3">
                <Field label="Desconto">
                    <input
                        className={inputClass}
                        max={100}
                        min={1}
                        onChange={(event) =>
                            setDiscountPercent(event.target.value)
                        }
                        required
                        type="number"
                        value={discountPercent}
                    />
                </Field>
                <Field label="Escopo">
                    <select
                        className={inputClass}
                        onChange={(event) =>
                            setScope(
                                event.target
                                    .value as CreateMarketingPromotionInput["scope"],
                            )
                        }
                        value={scope}
                    >
                        <option value="ALL_PRODUCTS">Todos</option>
                        <option value="CATEGORY">Categoria</option>
                    </select>
                </Field>
            </div>
            {scope === "CATEGORY" ? (
                <Field label="Categoria">
                    <select
                        className={inputClass}
                        onChange={(event) =>
                            setCategory(event.target.value as ProductCategory)
                        }
                        value={category}
                    >
                        <option value="SELFCARE">Selfcare</option>
                        <option value="ARTISANAL">Artesanal</option>
                    </select>
                </Field>
            ) : null}
            <Field label="Início">
                <input
                    className={inputClass}
                    onChange={(event) => setStartsAt(event.target.value)}
                    required
                    type="datetime-local"
                    value={startsAt}
                />
            </Field>
            <Field label="Fim">
                <input
                    className={inputClass}
                    onChange={(event) => setEndsAt(event.target.value)}
                    type="datetime-local"
                    value={endsAt}
                />
            </Field>
            <Checkbox
                checked={isActive}
                label="Promoção ativa"
                onChange={setIsActive}
            />
            <SubmitButton isPending={isPending} label="Salvar promoção" />
        </form>
    );
}

function CouponForm({
    editing,
    isPending,
    onSubmit,
}: {
    editing: MarketingCoupon | null;
    isPending: boolean;
    onSubmit: (payload: CreateMarketingCouponInput) => Promise<void>;
}) {
    const [code, setCode] = useState(editing?.code ?? "");
    const [discountPercent, setDiscountPercent] = useState(
        String(editing?.discountPercent ?? 10),
    );
    const [validUntil, setValidUntil] = useState(
        toDatetimeLocal(editing?.validUntil ?? null),
    );
    const [maxUses, setMaxUses] = useState(
        editing?.maxUses ? String(editing.maxUses) : "",
    );
    const [emails, setEmails] = useState(editing?.emails.join(", ") ?? "");
    const [stackableWithPromotions, setStackableWithPromotions] = useState(
        editing?.stackableWithPromotions ?? false,
    );
    const [isActive, setIsActive] = useState(editing?.isActive ?? true);

    return (
        <form
            className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm"
            onSubmit={async (event) => {
                event.preventDefault();
                const payload: CreateMarketingCouponInput = {
                    code,
                    discountPercent: Number(discountPercent),
                    validUntil: fromDatetimeLocal(validUntil),
                    maxUses: maxUses ? Number(maxUses) : null,
                    emails: emails
                        .split(",")
                        .map((email) => email.trim())
                        .filter(Boolean),
                    stackableWithPromotions,
                    isActive,
                };

                await onSubmit(payload);
            }}
        >
            <Field label="Código">
                <input
                    className={`${inputClass} uppercase`}
                    onChange={(event) => setCode(event.target.value)}
                    required
                    value={code}
                />
            </Field>
            <div className="grid grid-cols-2 gap-3">
                <Field label="Desconto">
                    <input
                        className={inputClass}
                        max={100}
                        min={1}
                        onChange={(event) =>
                            setDiscountPercent(event.target.value)
                        }
                        required
                        type="number"
                        value={discountPercent}
                    />
                </Field>
                <Field label="Usos máximos">
                    <input
                        className={inputClass}
                        min={1}
                        onChange={(event) => setMaxUses(event.target.value)}
                        placeholder="Sem limite"
                        type="number"
                        value={maxUses}
                    />
                </Field>
            </div>
            <Field label="Validade">
                <input
                    className={inputClass}
                    onChange={(event) => setValidUntil(event.target.value)}
                    type="datetime-local"
                    value={validUntil}
                />
            </Field>
            <Field label="Emails liberados">
                <textarea
                    className={`${inputClass} min-h-20 resize-none`}
                    onChange={(event) => setEmails(event.target.value)}
                    placeholder="maria@email.com, ana@email.com"
                    value={emails}
                />
            </Field>
            <Checkbox
                checked={stackableWithPromotions}
                label="Acumula com promoção"
                onChange={setStackableWithPromotions}
            />
            <Checkbox
                checked={isActive}
                label="Cupom ativo"
                onChange={setIsActive}
            />
            <SubmitButton isPending={isPending} label="Salvar cupom" />
        </form>
    );
}

function Field({
    children,
    label,
}: {
    children: React.ReactNode;
    label: string;
}) {
    return (
        <label className="mb-3 block text-xs font-bold uppercase tracking-[0.12em] text-slate-500">
            <span className="mb-1.5 block">{label}</span>
            {children}
        </label>
    );
}

function Checkbox({
    checked,
    label,
    onChange,
}: {
    checked: boolean;
    label: string;
    onChange: (checked: boolean) => void;
}) {
    return (
        <label className="mb-3 flex items-center gap-2 text-sm font-bold text-slate-700">
            <input
                checked={checked}
                className="size-4 accent-primary"
                onChange={(event) => onChange(event.target.checked)}
                type="checkbox"
            />
            {label}
        </label>
    );
}

function SubmitButton({
    isPending,
    label,
}: {
    isPending: boolean;
    label: string;
}) {
    return (
        <button
            className="mt-2 w-full rounded-lg bg-primary px-4 py-3 text-sm font-bold text-white disabled:cursor-wait disabled:opacity-70"
            disabled={isPending}
            type="submit"
        >
            {isPending ? "Salvando..." : label}
        </button>
    );
}
