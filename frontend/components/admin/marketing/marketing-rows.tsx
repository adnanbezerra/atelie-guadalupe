import type { MarketingCoupon, MarketingPromotion } from "@/lib/types";
import { formatDate } from "@/lib/utils";
import {
    activeLabel,
    isActiveCoupon,
    percentLabel,
    promotionScopeLabel,
} from "./utils";

export function PromotionRow({
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

export function CouponRow({
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

export function EmptyState({ label }: { label: string }) {
    return (
        <p className="rounded-xl border border-dashed border-slate-200 bg-white p-8 text-center text-sm font-semibold text-slate-400">
            {label}
        </p>
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
