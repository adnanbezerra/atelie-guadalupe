import {
    DialogContent,
    DialogDescription,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog";
import type { MarketingCoupon, MarketingPromotion } from "@/lib/types";
import { CouponRow, EmptyState, PromotionRow } from "./marketing-rows";
import type { MarketingTab } from "./types";

type MarketingManagementDialogProps = {
    activeCoupons: MarketingCoupon[];
    activePromotions: MarketingPromotion[];
    error: string | null;
    onCreateCoupon: () => void;
    onCreatePromotion: () => void;
    onDeactivateCoupon: (uuid: string) => Promise<void>;
    onDeactivatePromotion: (uuid: string) => Promise<void>;
    onEditCoupon: (item: MarketingCoupon) => void;
    onEditPromotion: (item: MarketingPromotion) => void;
    onTabChange: (tab: MarketingTab) => void;
    tab: MarketingTab;
};

export function MarketingManagementDialog({
    activeCoupons,
    activePromotions,
    error,
    onCreateCoupon,
    onCreatePromotion,
    onDeactivateCoupon,
    onDeactivatePromotion,
    onEditCoupon,
    onEditPromotion,
    onTabChange,
    tab,
}: MarketingManagementDialogProps) {
    return (
        <DialogContent className="max-h-[92vh] max-w-4xl overflow-hidden rounded-xl bg-slate-50">
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
                            count={activePromotions.length}
                            icon="local_offer"
                            label="Promoções"
                            onClick={() => onTabChange("promotions")}
                        />
                        <TabButton
                            active={tab === "coupons"}
                            count={activeCoupons.length}
                            icon="confirmation_number"
                            label="Cupons"
                            onClick={() => onTabChange("coupons")}
                        />
                    </div>
                    {error ? (
                        <p className="mt-4 rounded-lg border border-red-100 bg-red-50 p-3 text-xs font-semibold text-red-700">
                            {error}
                        </p>
                    ) : null}
                </aside>

                <main className="p-5">
                    {tab === "promotions" ? (
                        <PromotionsManager
                            items={activePromotions}
                            onCreate={onCreatePromotion}
                            onDeactivate={onDeactivatePromotion}
                            onEdit={onEditPromotion}
                        />
                    ) : (
                        <CouponsManager
                            items={activeCoupons}
                            onCreate={onCreateCoupon}
                            onDeactivate={onDeactivateCoupon}
                            onEdit={onEditCoupon}
                        />
                    )}
                </main>
            </div>
        </DialogContent>
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
    items,
    onCreate,
    onDeactivate,
    onEdit,
}: {
    items: MarketingPromotion[];
    onCreate: () => void;
    onDeactivate: (uuid: string) => Promise<void>;
    onEdit: (item: MarketingPromotion) => void;
}) {
    return (
        <div className="space-y-4">
            <ManagementHeader
                buttonLabel="Nova promoção"
                description="Campanhas em vigor ou dentro da janela atual."
                onCreate={onCreate}
                title="Promoções ativas"
            />
            <div className="space-y-3">
                {items.map((promotion) => (
                    <PromotionRow
                        key={promotion.uuid}
                        onDeactivate={onDeactivate}
                        onEdit={() => onEdit(promotion)}
                        promotion={promotion}
                    />
                ))}
                {!items.length ? (
                    <EmptyState label="Nenhuma promoção ativa." />
                ) : null}
            </div>
        </div>
    );
}

function CouponsManager({
    items,
    onCreate,
    onDeactivate,
    onEdit,
}: {
    items: MarketingCoupon[];
    onCreate: () => void;
    onDeactivate: (uuid: string) => Promise<void>;
    onEdit: (item: MarketingCoupon) => void;
}) {
    return (
        <div className="space-y-4">
            <ManagementHeader
                buttonLabel="Novo cupom"
                description="Códigos disponíveis para uso no carrinho."
                onCreate={onCreate}
                title="Cupons ativos"
            />
            <div className="space-y-3">
                {items.map((coupon) => (
                    <CouponRow
                        coupon={coupon}
                        key={coupon.uuid}
                        onDeactivate={onDeactivate}
                        onEdit={() => onEdit(coupon)}
                    />
                ))}
                {!items.length ? (
                    <EmptyState label="Nenhum cupom ativo." />
                ) : null}
            </div>
        </div>
    );
}

function ManagementHeader({
    buttonLabel,
    description,
    onCreate,
    title,
}: {
    buttonLabel: string;
    description: string;
    onCreate: () => void;
    title: string;
}) {
    return (
        <div className="flex flex-col justify-between gap-3 rounded-xl border border-slate-200 bg-white p-4 shadow-sm sm:flex-row sm:items-center">
            <div>
                <h3 className="text-lg font-bold text-slate-900">{title}</h3>
                <p className="mt-1 text-sm text-slate-500">{description}</p>
            </div>
            <button
                className="flex items-center justify-center gap-2 rounded-lg bg-primary px-4 py-3 text-sm font-bold text-white"
                onClick={onCreate}
                type="button"
            >
                <span className="material-symbols-outlined text-lg">add</span>
                {buttonLabel}
            </button>
        </div>
    );
}
