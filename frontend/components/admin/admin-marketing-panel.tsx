"use client";

import { useMemo, useState } from "react";
import { FeedbackDialog } from "@/components/shared/feedback-dialog";
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
    const [feedback, setFeedback] = useState<{
        title: string;
        description: string;
    } | null>(null);
    const [isErrorDismissed, setIsErrorDismissed] = useState(false);

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
                        setIsErrorDismissed(false);
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
                    onCreateCoupon={() => setEditor({ kind: "coupon" })}
                    onCreatePromotion={() => setEditor({ kind: "promotion" })}
                    onDeactivateCoupon={async (uuid) => {
                        try {
                            await marketing.deactivateCoupon(uuid);
                            setFeedback({
                                title: "Cupom cancelado",
                                description:
                                    "O cupom não poderá mais ser usado em novas compras.",
                            });
                        } catch (error) {
                            setFeedback({
                                title: "Não foi possível cancelar o cupom",
                                description:
                                    error instanceof Error
                                        ? error.message
                                        : "Tente novamente.",
                            });
                        }
                    }}
                    onDeactivatePromotion={async (uuid) => {
                        try {
                            await marketing.deactivatePromotion(uuid);
                            setFeedback({
                                title: "Promoção desativada",
                                description:
                                    "A promoção deixou de ser aplicada a novas compras.",
                            });
                        } catch (error) {
                            setFeedback({
                                title: "Não foi possível desativar a promoção",
                                description:
                                    error instanceof Error
                                        ? error.message
                                        : "Tente novamente.",
                            });
                        }
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

                    try {
                        if (editor.item) {
                            await marketing.updateCoupon(
                                editor.item.uuid,
                                payload,
                            );
                            setFeedback({
                                title: "Cupom atualizado",
                                description:
                                    "As novas regras já estão valendo.",
                            });
                        } else {
                            await marketing.createCoupon(payload);
                            setFeedback({
                                title: "Cupom criado",
                                description: "O novo cupom já pode ser usado.",
                            });
                        }

                        setEditor(null);
                    } catch (error) {
                        setFeedback({
                            title: "Não foi possível salvar o cupom",
                            description:
                                error instanceof Error
                                    ? error.message
                                    : "Revise os dados e tente novamente.",
                        });
                    }
                }}
                onSubmitPromotion={async (payload) => {
                    if (editor?.kind !== "promotion") return;

                    try {
                        if (editor.item) {
                            await marketing.updatePromotion(
                                editor.item.uuid,
                                payload,
                            );
                            setFeedback({
                                title: "Promoção atualizada",
                                description:
                                    "As novas regras já estão valendo.",
                            });
                        } else {
                            await marketing.createPromotion(payload);
                            setFeedback({
                                title: "Promoção criada",
                                description:
                                    "A nova promoção já pode ser aplicada.",
                            });
                        }

                        setEditor(null);
                    } catch (error) {
                        setFeedback({
                            title: "Não foi possível salvar a promoção",
                            description:
                                error instanceof Error
                                    ? error.message
                                    : "Revise os dados e tente novamente.",
                        });
                    }
                }}
            />
            <FeedbackDialog
                description={
                    feedback?.description ??
                    marketing.error ??
                    "Não foi possível concluir a operação."
                }
                onOpenChange={(nextOpen) => {
                    if (!nextOpen) {
                        setFeedback(null);
                        setIsErrorDismissed(true);
                    }
                }}
                open={
                    Boolean(feedback) ||
                    (Boolean(marketing.error) && !isErrorDismissed)
                }
                title={feedback?.title ?? "Marketing indisponível"}
            />
        </>
    );
}
