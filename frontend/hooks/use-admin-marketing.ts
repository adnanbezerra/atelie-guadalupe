"use client";

import { useApiResource } from "@/hooks/use-api-resource";
import { useApiToken } from "@/hooks/use-api-token";
import {
    cancelMarketingCoupon,
    createMarketingCoupon,
    createMarketingPromotion,
    getMarketing,
    updateMarketingCoupon,
    updateMarketingPromotion,
} from "@/lib/api";
import type {
    CreateMarketingCouponInput,
    CreateMarketingPromotionInput,
    MarketingPayload,
    UpdateMarketingCouponInput,
    UpdateMarketingPromotionInput,
} from "@/lib/types";

const emptyMarketing: MarketingPayload = {
    promotions: [],
    coupons: [],
};

export function useAdminMarketing(initialData: MarketingPayload | null) {
    const token = useApiToken();
    const resource = useApiResource<MarketingPayload>(
        initialData ?? emptyMarketing,
        async () => {
            if (!token) {
                throw new Error("Faça login para consultar marketing.");
            }

            return getMarketing(token);
        },
    );

    return {
        ...resource,
        async refreshMarketing() {
            await resource.refresh();
        },
        async createPromotion(payload: CreateMarketingPromotionInput) {
            if (!token) {
                throw new Error("Faça login para criar promoções.");
            }

            await createMarketingPromotion(token, payload);
            await resource.refresh();
        },
        async updatePromotion(
            promotionUuid: string,
            payload: UpdateMarketingPromotionInput,
        ) {
            if (!token) {
                throw new Error("Faça login para editar promoções.");
            }

            await updateMarketingPromotion(token, promotionUuid, payload);
            await resource.refresh();
        },
        async deactivatePromotion(promotionUuid: string) {
            if (!token) {
                throw new Error("Faça login para desativar promoções.");
            }

            await updateMarketingPromotion(token, promotionUuid, {
                isActive: false,
            });
            await resource.refresh();
        },
        async createCoupon(payload: CreateMarketingCouponInput) {
            if (!token) {
                throw new Error("Faça login para criar cupons.");
            }

            await createMarketingCoupon(token, payload);
            await resource.refresh();
        },
        async updateCoupon(
            couponUuid: string,
            payload: UpdateMarketingCouponInput,
        ) {
            if (!token) {
                throw new Error("Faça login para editar cupons.");
            }

            await updateMarketingCoupon(token, couponUuid, payload);
            await resource.refresh();
        },
        async deactivateCoupon(couponUuid: string) {
            if (!token) {
                throw new Error("Faça login para cancelar cupons.");
            }

            await cancelMarketingCoupon(token, couponUuid);
            await resource.refresh();
        },
    };
}
