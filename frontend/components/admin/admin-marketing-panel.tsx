"use client";

import type React from "react";
import { useMemo, useState } from "react";
import { toast } from "sonner";
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
} from "@/components/ui/dialog";
import { useAdminMarketing } from "@/hooks/use-admin-marketing";
import type {
    CreateMarketingCouponInput,
    CreateMarketingPromotionInput,
    MarketingCoupon,
    MarketingPayload,
    MarketingPromotion,
    ProductCategory,
} from "@/lib/types";
import { formatDate } from "@/lib/utils";

type AdminMarketingPanelProps = {
    initialMarketing: MarketingPayload | null;
};

type MarketingTab = "promotions" | "coupons";

const categoryLabels: Record<ProductCategory, string> = {
    ARTISANAL: "Artesanal",
    SELFCARE: "Selfcare",
};

const now = () => new Date();
const inputClass =
    "w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm font-semibold text-slate-800 outline-none focus:border-primary focus:ring-4 focus:ring-primary/10";

function isActiveWindow(startsAt: string, endsAt: string | null) {
    const current = now();
    return (
        new Date(startsAt) <= current &&
        (!endsAt || new Date(endsAt) >= current)
    );
}

function isActiveCoupon(coupon: MarketingCoupon) {
    return (
        coupon.isActive &&
        !coupon.cancelledAt &&
        (!coupon.validUntil || new Date(coupon.validUntil) >= now())
    );
}

function toDatetimeLocal(value: string | null) {
    if (!value) return "";

    const date = new Date(value);
    const offset = date.getTimezoneOffset();
    const local = new Date(date.getTime() - offset * 60 * 1000);

    return local.toISOString().slice(0, 16);
}

function fromDatetimeLocal(value: string) {
    return value ? new Date(value).toISOString() : null;
}

function percentLabel(value: number) {
    return `${value}%`;
}

function promotionScopeLabel(promotion: MarketingPromotion) {
    if (promotion.scope === "CATEGORY" && promotion.category) {
        return categoryLabels[promotion.category] ?? promotion.category;
    }

    return "Todos os produtos";
}

function activeLabel(isActive: boolean) {
    return isActive ? "Ativo" : "Inativo";
}

export function AdminMarketingPanel({
    initialMarketing,
}: AdminMarketingPanelProps) {
    const marketing = useAdminMarketing(initialMarketing);
    const [open, setOpen] = useState(false);
    const [tab, setTab] = useState<MarketingTab>("promotions");

    const activePromotions = useMemo(
        () =>
            marketing.data.promotions.filter(
                (promotion) =>
                    promotion.isActive &&
                    isActiveWindow(promotion.startsAt, promotion.endsAt),
            ),
        [marketing.data.promotions],
    );
    const activeCoupons = useMemo(
        () => marketing.data.coupons.filter(isActiveCoupon),
        [marketing.data.coupons],
    );

    return (
        <Dialog
            open={open}
            onOpenChange={(nextOpen) => {
                setOpen(nextOpen);
                if (nextOpen) {
                    void marketing.refreshMarketing();
                }
            }}
        >
            <DialogTrigger asChild>
                <button className="group h-full min-h-[354px] w-full rounded-xl border border-slate-200 bg-white p-0 text-left shadow-sm outline-none transition hover:-translate-y-0.5 hover:border-primary/30 focus-visible:ring-4 focus-visible:ring-primary/20">
                    <div className="flex h-full flex-col overflow-hidden rounded-xl">
                        <div className="flex items-center justify-between border-b border-slate-200 px-6 py-5">
                            <div>
                                <h3 className="text-lg font-bold text-slate-900">
                                    Promoções e Cupons
                                </h3>
                                <p className="mt-1 text-xs font-bold uppercase tracking-[0.14em] text-slate-400">
                                    Marketing ativo
                                </p>
                            </div>
                            <span className="material-symbols-outlined rounded-lg bg-primary/10 p-2 text-primary group-hover:bg-primary group-hover:text-white">
                                sell
                            </span>
                        </div>

                        <div className="grid flex-1 grid-rows-2">
                            <MarketingPreviewList
                                empty="Nenhuma promoção ativa"
                                icon="local_offer"
                                items={activePromotions
                                    .slice(0, 3)
                                    .map((promotion) => ({
                                        key: promotion.uuid,
                                        title: promotion.name,
                                        detail: `${percentLabel(
                                            promotion.discountPercent,
                                        )} · ${promotionScopeLabel(promotion)}`,
                                    }))}
                                label={`${activePromotions.length} promoções`}
                            />
                            <MarketingPreviewList
                                empty="Nenhum cupom ativo"
                                icon="confirmation_number"
                                items={activeCoupons
                                    .slice(0, 3)
                                    .map((coupon) => ({
                                        key: coupon.uuid,
                                        title: coupon.code,
                                        detail: `${percentLabel(
                                            coupon.discountPercent,
                                        )} · ${coupon.usedCount}/${
                                            coupon.maxUses ?? "sem limite"
                                        } usos`,
                                    }))}
                                label={`${activeCoupons.length} cupons`}
                            />
                        </div>

                        <div className="border-t border-slate-200 bg-slate-50 px-6 py-3 text-sm font-bold text-primary">
                            Abrir gestão de marketing
                        </div>
                    </div>
                </button>
            </DialogTrigger>

            <DialogContent className="max-h-[92vh] max-w-6xl overflow-hidden rounded-xl bg-slate-50">
                <DialogHeader className="border-b border-slate-200 bg-white p-6">
                    <DialogTitle className="font-display text-2xl font-bold text-slate-900">
                        Gestão de Promoções e Cupons
                    </DialogTitle>
                    <DialogDescription className="text-sm leading-6 text-slate-500">
                        Controle campanhas ativas, crie regras novas e desative
                        itens sem remover histórico.
                    </DialogDescription>
                </DialogHeader>

                <div className="grid max-h-[calc(92vh-121px)] grid-cols-1 overflow-y-auto lg:grid-cols-[15rem_1fr]">
                    <aside className="border-b border-slate-200 bg-white p-4 lg:border-r lg:border-b-0">
                        <div className="grid grid-cols-2 gap-2 lg:grid-cols-1">
                            <TabButton
                                active={tab === "promotions"}
                                count={marketing.data.promotions.length}
                                icon="local_offer"
                                label="Promoções"
                                onClick={() => setTab("promotions")}
                            />
                            <TabButton
                                active={tab === "coupons"}
                                count={marketing.data.coupons.length}
                                icon="confirmation_number"
                                label="Cupons"
                                onClick={() => setTab("coupons")}
                            />
                        </div>
                        {marketing.error ? (
                            <p className="mt-4 rounded-lg border border-red-100 bg-red-50 p-3 text-xs font-semibold text-red-700">
                                {marketing.error}
                            </p>
                        ) : null}
                    </aside>

                    <main className="p-5">
                        {tab === "promotions" ? (
                            <PromotionsManager
                                isPending={marketing.isPending}
                                items={marketing.data.promotions}
                                onCreate={async (payload) => {
                                    await marketing.createPromotion(payload);
                                    toast.success("Promoção criada.");
                                }}
                                onDeactivate={async (uuid) => {
                                    await marketing.deactivatePromotion(uuid);
                                    toast.success("Promoção desativada.");
                                }}
                                onUpdate={async (uuid, payload) => {
                                    await marketing.updatePromotion(
                                        uuid,
                                        payload,
                                    );
                                    toast.success("Promoção atualizada.");
                                }}
                            />
                        ) : (
                            <CouponsManager
                                isPending={marketing.isPending}
                                items={marketing.data.coupons}
                                onCreate={async (payload) => {
                                    await marketing.createCoupon(payload);
                                    toast.success("Cupom criado.");
                                }}
                                onDeactivate={async (uuid) => {
                                    await marketing.deactivateCoupon(uuid);
                                    toast.success("Cupom cancelado.");
                                }}
                                onUpdate={async (uuid, payload) => {
                                    await marketing.updateCoupon(uuid, payload);
                                    toast.success("Cupom atualizado.");
                                }}
                            />
                        )}
                    </main>
                </div>
            </DialogContent>
        </Dialog>
    );
}

function MarketingPreviewList({
    empty,
    icon,
    items,
    label,
}: {
    empty: string;
    icon: string;
    items: Array<{ key: string; title: string; detail: string }>;
    label: string;
}) {
    return (
        <section className="border-b border-slate-100 px-6 py-4 last:border-b-0">
            <div className="mb-3 flex items-center justify-between">
                <p className="text-xs font-bold uppercase tracking-[0.14em] text-slate-500">
                    {label}
                </p>
                <span className="material-symbols-outlined text-base text-secondary">
                    {icon}
                </span>
            </div>
            <div className="space-y-2">
                {items.length ? (
                    items.map((item) => (
                        <div
                            className="rounded-lg border border-slate-100 bg-slate-50 px-3 py-2"
                            key={item.key}
                        >
                            <p className="truncate text-sm font-bold text-slate-900">
                                {item.title}
                            </p>
                            <p className="truncate text-xs text-slate-500">
                                {item.detail}
                            </p>
                        </div>
                    ))
                ) : (
                    <p className="rounded-lg border border-dashed border-slate-200 bg-white px-3 py-4 text-sm font-semibold text-slate-400">
                        {empty}
                    </p>
                )}
            </div>
        </section>
    );
}

function TabButton({
    active,
    count,
    icon,
    label,
    onClick,
}: {
    active: boolean;
    count: number;
    icon: string;
    label: string;
    onClick: () => void;
}) {
    return (
        <button
            className={`flex items-center justify-between gap-3 rounded-lg border px-3 py-3 text-left text-sm font-bold ${
                active
                    ? "border-primary bg-primary text-white"
                    : "border-slate-200 bg-white text-slate-700 hover:bg-slate-50"
            }`}
            onClick={onClick}
            type="button"
        >
            <span className="flex items-center gap-2">
                <span className="material-symbols-outlined text-lg">
                    {icon}
                </span>
                {label}
            </span>
            <span
                className={`rounded-full px-2 py-0.5 text-xs ${
                    active
                        ? "bg-white/20 text-white"
                        : "bg-slate-100 text-slate-500"
                }`}
            >
                {count}
            </span>
        </button>
    );
}

function PromotionsManager({
    isPending,
    items,
    onCreate,
    onDeactivate,
    onUpdate,
}: {
    isPending: boolean;
    items: MarketingPromotion[];
    onCreate: (payload: CreateMarketingPromotionInput) => Promise<void>;
    onDeactivate: (uuid: string) => Promise<void>;
    onUpdate: (
        uuid: string,
        payload: CreateMarketingPromotionInput,
    ) => Promise<void>;
}) {
    const [editing, setEditing] = useState<MarketingPromotion | null>(null);
    const [formVersion, setFormVersion] = useState(0);

    return (
        <div className="grid gap-5 xl:grid-cols-[24rem_1fr]">
            <PromotionForm
                editing={editing}
                isPending={isPending}
                key={`${editing?.uuid ?? "new"}-${formVersion}`}
                onCancelEdit={() => setEditing(null)}
                onSubmit={async (payload) => {
                    if (editing) {
                        await onUpdate(editing.uuid, payload);
                        setEditing(null);
                        return;
                    }

                    await onCreate(payload);
                    setFormVersion((version) => version + 1);
                }}
            />
            <div className="space-y-3">
                {items.map((promotion) => (
                    <PromotionRow
                        key={promotion.uuid}
                        onDeactivate={onDeactivate}
                        onEdit={() => setEditing(promotion)}
                        promotion={promotion}
                    />
                ))}
                {!items.length ? (
                    <EmptyState label="Nenhuma promoção." />
                ) : null}
            </div>
        </div>
    );
}

function CouponsManager({
    isPending,
    items,
    onCreate,
    onDeactivate,
    onUpdate,
}: {
    isPending: boolean;
    items: MarketingCoupon[];
    onCreate: (payload: CreateMarketingCouponInput) => Promise<void>;
    onDeactivate: (uuid: string) => Promise<void>;
    onUpdate: (
        uuid: string,
        payload: CreateMarketingCouponInput,
    ) => Promise<void>;
}) {
    const [editing, setEditing] = useState<MarketingCoupon | null>(null);
    const [formVersion, setFormVersion] = useState(0);

    return (
        <div className="grid gap-5 xl:grid-cols-[24rem_1fr]">
            <CouponForm
                editing={editing}
                isPending={isPending}
                key={`${editing?.uuid ?? "new"}-${formVersion}`}
                onCancelEdit={() => setEditing(null)}
                onSubmit={async (payload) => {
                    if (editing) {
                        await onUpdate(editing.uuid, payload);
                        setEditing(null);
                        return;
                    }

                    await onCreate(payload);
                    setFormVersion((version) => version + 1);
                }}
            />
            <div className="space-y-3">
                {items.map((coupon) => (
                    <CouponRow
                        coupon={coupon}
                        key={coupon.uuid}
                        onDeactivate={onDeactivate}
                        onEdit={() => setEditing(coupon)}
                    />
                ))}
                {!items.length ? <EmptyState label="Nenhum cupom." /> : null}
            </div>
        </div>
    );
}

function PromotionForm({
    editing,
    isPending,
    onCancelEdit,
    onSubmit,
}: {
    editing: MarketingPromotion | null;
    isPending: boolean;
    onCancelEdit: () => void;
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
            <FormTitle
                action={editing ? "Editando promoção" : "Nova promoção"}
                onCancelEdit={editing ? onCancelEdit : undefined}
            />
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
    onCancelEdit,
    onSubmit,
}: {
    editing: MarketingCoupon | null;
    isPending: boolean;
    onCancelEdit: () => void;
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
            <FormTitle
                action={editing ? "Editando cupom" : "Novo cupom"}
                onCancelEdit={editing ? onCancelEdit : undefined}
            />
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

function PromotionRow({
    onDeactivate,
    onEdit,
    promotion,
}: {
    onDeactivate: (uuid: string) => Promise<void>;
    onEdit: () => void;
    promotion: MarketingPromotion;
}) {
    return (
        <article className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
            <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
                <div>
                    <div className="flex flex-wrap items-center gap-2">
                        <h4 className="text-base font-bold text-slate-900">
                            {promotion.name}
                        </h4>
                        <StatusBadge active={promotion.isActive} />
                    </div>
                    <p className="mt-1 text-sm text-slate-500">
                        {percentLabel(promotion.discountPercent)} ·{" "}
                        {promotionScopeLabel(promotion)}
                    </p>
                    <p className="mt-2 text-xs font-semibold text-slate-400">
                        {formatDate(promotion.startsAt)} até{" "}
                        {promotion.endsAt
                            ? formatDate(promotion.endsAt)
                            : "sem expiração"}
                    </p>
                </div>
                <RowActions
                    disabled={!promotion.isActive}
                    onDeactivate={() => onDeactivate(promotion.uuid)}
                    onEdit={onEdit}
                />
            </div>
        </article>
    );
}

function CouponRow({
    coupon,
    onDeactivate,
    onEdit,
}: {
    coupon: MarketingCoupon;
    onDeactivate: (uuid: string) => Promise<void>;
    onEdit: () => void;
}) {
    return (
        <article className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
            <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
                <div>
                    <div className="flex flex-wrap items-center gap-2">
                        <h4 className="text-base font-bold tracking-wide text-slate-900">
                            {coupon.code}
                        </h4>
                        <StatusBadge active={isActiveCoupon(coupon)} />
                    </div>
                    <p className="mt-1 text-sm text-slate-500">
                        {percentLabel(coupon.discountPercent)} ·{" "}
                        {coupon.usedCount}/{coupon.maxUses ?? "sem limite"} usos
                    </p>
                    <p className="mt-2 text-xs font-semibold text-slate-400">
                        {coupon.validUntil
                            ? `Válido até ${formatDate(coupon.validUntil)}`
                            : "Sem expiração"}{" "}
                        · {coupon.emails.length || "público"}
                        {coupon.emails.length === 1 ? " email" : " emails"}
                    </p>
                </div>
                <RowActions
                    disabled={!isActiveCoupon(coupon)}
                    onDeactivate={() => onDeactivate(coupon.uuid)}
                    onEdit={onEdit}
                />
            </div>
        </article>
    );
}

function StatusBadge({ active }: { active: boolean }) {
    return (
        <span
            className={`rounded-full px-2 py-1 text-[10px] font-bold uppercase tracking-wider ${
                active
                    ? "bg-emerald-50 text-emerald-700"
                    : "bg-slate-100 text-slate-500"
            }`}
        >
            {activeLabel(active)}
        </span>
    );
}

function RowActions({
    disabled,
    onDeactivate,
    onEdit,
}: {
    disabled: boolean;
    onDeactivate: () => Promise<void>;
    onEdit: () => void;
}) {
    return (
        <div className="flex gap-2">
            <button
                className="rounded-lg border border-slate-200 px-3 py-2 text-sm font-bold text-slate-700 hover:bg-slate-50"
                onClick={onEdit}
                type="button"
            >
                Editar
            </button>
            <button
                className="rounded-lg border border-red-100 px-3 py-2 text-sm font-bold text-red-700 hover:bg-red-50 disabled:cursor-not-allowed disabled:opacity-40"
                disabled={disabled}
                onClick={() => void onDeactivate()}
                type="button"
            >
                Desativar
            </button>
        </div>
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

function FormTitle({
    action,
    onCancelEdit,
}: {
    action: string;
    onCancelEdit?: () => void;
}) {
    return (
        <div className="mb-4 flex items-center justify-between gap-3">
            <h3 className="text-lg font-bold text-slate-900">{action}</h3>
            {onCancelEdit ? (
                <button
                    className="text-sm font-bold text-slate-500 hover:text-slate-900"
                    onClick={onCancelEdit}
                    type="button"
                >
                    Cancelar
                </button>
            ) : null}
        </div>
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

function EmptyState({ label }: { label: string }) {
    return (
        <p className="rounded-xl border border-dashed border-slate-200 bg-white p-8 text-center text-sm font-semibold text-slate-400">
            {label}
        </p>
    );
}
