"use client";

import { useMemo, useState } from "react";
import { toast } from "sonner";
import { Dialog, DialogTrigger } from "@/components/ui/dialog";
import { useAdminMarketing } from "@/hooks/use-admin-marketing";
import type { MarketingPayload } from "@/lib/types";
import { MarketingEditorDialog } from "./marketing/marketing-editor-dialog";
import { MarketingManagementDialog } from "./marketing/marketing-management-dialog";
import { MarketingSummaryCard } from "./marketing/marketing-summary-card";
import type { MarketingEditor, MarketingTab } from "./marketing/types";
import {
    isActiveCoupon,
    isActiveWindow,
    percentLabel,
    promotionScopeLabel,
} from "./marketing/utils";

type AdminMarketingPanelProps = {
    initialMarketing: MarketingPayload | null;
};

export function AdminMarketingPanel({
    initialMarketing,
}: AdminMarketingPanelProps) {
    const marketing = useAdminMarketing(initialMarketing);
    const [open, setOpen] = useState(false);
    const [tab, setTab] = useState<MarketingTab>("promotions");
    const [editor, setEditor] = useState<MarketingEditor | null>(null);

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
        <>
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
                    <MarketingSummaryCard
                        couponItems={activeCoupons
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
                        couponsCount={activeCoupons.length}
                        promotionItems={activePromotions
                            .slice(0, 3)
                            .map((promotion) => ({
                                key: promotion.uuid,
                                title: promotion.name,
                                detail: `${percentLabel(
                                    promotion.discountPercent,
                                )} · ${promotionScopeLabel(promotion)}`,
                            }))}
                        promotionsCount={activePromotions.length}
                    />
                </DialogTrigger>

                <MarketingManagementDialog
                    activeCoupons={activeCoupons}
                    activePromotions={activePromotions}
                    error={marketing.error}
                    onCreateCoupon={() => setEditor({ kind: "coupon" })}
                    onCreatePromotion={() => setEditor({ kind: "promotion" })}
                    onDeactivateCoupon={async (uuid) => {
                        await marketing.deactivateCoupon(uuid);
                        toast.success("Cupom cancelado.");
                    }}
                    onDeactivatePromotion={async (uuid) => {
                        await marketing.deactivatePromotion(uuid);
                        toast.success("Promoção desativada.");
                    }}
                    onEditCoupon={(item) => setEditor({ kind: "coupon", item })}
                    onEditPromotion={(item) =>
                        setEditor({ kind: "promotion", item })
                    }
                    onTabChange={setTab}
                    tab={tab}
                />
            </Dialog>

            <MarketingEditorDialog
                editor={editor}
                isPending={marketing.isPending}
                onOpenChange={(nextOpen) => {
                    if (!nextOpen) {
                        setEditor(null);
                    }
                }}
                onSubmitCoupon={async (payload) => {
                    if (editor?.kind !== "coupon") return;

                    if (editor.item) {
                        await marketing.updateCoupon(editor.item.uuid, payload);
                        toast.success("Cupom atualizado.");
                    } else {
                        await marketing.createCoupon(payload);
                        toast.success("Cupom criado.");
                    }

                    setEditor(null);
                }}
                onSubmitPromotion={async (payload) => {
                    if (editor?.kind !== "promotion") return;

                    if (editor.item) {
                        await marketing.updatePromotion(
                            editor.item.uuid,
                            payload,
                        );
                        toast.success("Promoção atualizada.");
                    } else {
                        await marketing.createPromotion(payload);
                        toast.success("Promoção criada.");
                    }

                    setEditor(null);
                }}
            />
        </>
    );
}
