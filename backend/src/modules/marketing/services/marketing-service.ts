import { PromotionScope } from "../../../generated/prisma/enums";
import { Either, left, right } from "../../../core/either/either";
import { AppError } from "../../../core/errors/app-error";
import { slugify } from "../../../core/utils/slug";
import { createUuid } from "../../../core/utils/uuid";
import { MarketingRepository } from "../repositories/marketing-repository";
import { presentCoupon, presentPromotion } from "./marketing-presenter";

type CreateCouponInput = {
    code: string;
    discountPercent: number;
    validUntil?: Date;
    maxUses: number;
    emails: string[];
    stackableWithPromotions: boolean;
    isActive: boolean;
};

type UpdateCouponInput = {
    code?: string;
    discountPercent?: number;
    validUntil?: Date | null;
    maxUses?: number;
    emails?: string[];
    stackableWithPromotions?: boolean;
    isActive?: boolean;
};

type CreatePromotionInput = {
    name: string;
    scope: PromotionScope;
    category?: "SELFCARE" | "ARTISANAL";
    discountPercent: number;
    startsAt: Date;
    endsAt?: Date | null;
    isActive: boolean;
};

type UpdatePromotionInput = {
    name?: string;
    scope?: PromotionScope;
    category?: "SELFCARE" | "ARTISANAL" | null;
    discountPercent?: number;
    startsAt?: Date;
    endsAt?: Date | null;
    isActive?: boolean;
};

function normalizeCouponCode(code: string) {
    return code.trim().toUpperCase();
}

function uniqueEmails(emails: string[]) {
    return [...new Set(emails.map((email) => email.trim().toLowerCase()))];
}

export class MarketingService {
    public constructor(private readonly marketingRepository: MarketingRepository) {}

    public async listCoupons(): Promise<
        Either<AppError, { coupons: Array<ReturnType<typeof presentCoupon>> }>
    > {
        const coupons = await this.marketingRepository.listCoupons();

        return right({
            coupons: coupons.map((coupon) => presentCoupon(coupon))
        });
    }

    public async createCoupon(
        input: CreateCouponInput
    ): Promise<Either<AppError, { coupon: ReturnType<typeof presentCoupon> }>> {
        const code = normalizeCouponCode(input.code);
        const existing = await this.marketingRepository.findCouponByCode(code);
        if (existing) {
            return left(AppError.conflict("Ja existe um cupom com este codigo"));
        }

        const coupon = await this.marketingRepository.createCoupon({
            uuid: createUuid(),
            code,
            discountPercent: input.discountPercent,
            validUntil: input.validUntil ?? null,
            maxUses: input.maxUses,
            emails: uniqueEmails(input.emails),
            stackableWithPromotions: input.stackableWithPromotions,
            isActive: input.isActive
        });

        return right({
            coupon: presentCoupon(coupon)
        });
    }

    public async updateCoupon(
        couponUuid: string,
        input: UpdateCouponInput
    ): Promise<Either<AppError, { coupon: ReturnType<typeof presentCoupon> }>> {
        const existing = await this.marketingRepository.findCouponByUuid(couponUuid);
        if (!existing) {
            return left(AppError.notFound("Cupom nao encontrado"));
        }

        const code = input.code ? normalizeCouponCode(input.code) : undefined;
        if (code && code !== existing.code) {
            const conflict = await this.marketingRepository.findCouponByCode(code);
            if (conflict && conflict.uuid !== existing.uuid) {
                return left(AppError.conflict("Ja existe um cupom com este codigo"));
            }
        }

        const usedCount = await this.marketingRepository.countCouponRedemptions(existing.id);
        if (typeof input.maxUses === "number" && input.maxUses < usedCount) {
            return left(AppError.business("Limite de usos nao pode ser menor que usos existentes"));
        }

        const coupon = await this.marketingRepository.updateCouponByUuid(couponUuid, {
            ...(code ? { code } : {}),
            ...(typeof input.discountPercent === "number"
                ? { discountPercent: input.discountPercent }
                : {}),
            ...(input.validUntil !== undefined ? { validUntil: input.validUntil } : {}),
            ...(typeof input.maxUses === "number" ? { maxUses: input.maxUses } : {}),
            ...(input.emails ? { emails: uniqueEmails(input.emails) } : {}),
            ...(typeof input.stackableWithPromotions === "boolean"
                ? { stackableWithPromotions: input.stackableWithPromotions }
                : {}),
            ...(typeof input.isActive === "boolean" ? { isActive: input.isActive } : {})
        });

        return right({
            coupon: presentCoupon(coupon)
        });
    }

    public async cancelCoupon(
        couponUuid: string
    ): Promise<Either<AppError, { coupon: ReturnType<typeof presentCoupon> }>> {
        const existing = await this.marketingRepository.findCouponByUuid(couponUuid);
        if (!existing) {
            return left(AppError.notFound("Cupom nao encontrado"));
        }

        const coupon = await this.marketingRepository.cancelCouponByUuid(couponUuid);

        return right({
            coupon: presentCoupon(coupon)
        });
    }

    public async listPromotions(): Promise<
        Either<AppError, { promotions: Array<ReturnType<typeof presentPromotion>> }>
    > {
        const promotions = await this.marketingRepository.listPromotions();

        return right({
            promotions: promotions.map((promotion) => presentPromotion(promotion))
        });
    }

    public async createPromotion(
        input: CreatePromotionInput
    ): Promise<Either<AppError, { promotion: ReturnType<typeof presentPromotion> }>> {
        const slug = slugify(input.name);
        const existing = await this.marketingRepository.findPromotionBySlug(slug);
        if (existing) {
            return left(AppError.conflict("Ja existe uma promocao com este nome"));
        }

        const promotion = await this.marketingRepository.createPromotion({
            uuid: createUuid(),
            name: input.name.trim(),
            slug,
            scope: input.scope,
            category: input.scope === "CATEGORY" ? input.category : null,
            discountPercent: input.discountPercent,
            startsAt: input.startsAt,
            endsAt: input.endsAt ?? null,
            isActive: input.isActive
        });

        return right({
            promotion: presentPromotion(promotion)
        });
    }

    public async updatePromotion(
        promotionUuid: string,
        input: UpdatePromotionInput
    ): Promise<Either<AppError, { promotion: ReturnType<typeof presentPromotion> }>> {
        const existing = await this.marketingRepository.findPromotionByUuid(promotionUuid);
        if (!existing) {
            return left(AppError.notFound("Promocao nao encontrada"));
        }

        const nextScope = input.scope ?? existing.scope;
        const nextStartsAt = input.startsAt ?? existing.startsAt;
        const nextEndsAt = input.endsAt === undefined ? existing.endsAt : input.endsAt;
        const nextCategory =
            nextScope === "ALL_PRODUCTS"
                ? null
                : input.category === undefined
                  ? existing.category
                  : input.category;

        if (nextScope === "CATEGORY" && !nextCategory) {
            return left(AppError.business("Informe a categoria para promocao segmentada"));
        }

        if (nextScope === "ALL_PRODUCTS" && nextCategory) {
            return left(
                AppError.business("Promocao para todos os produtos nao deve receber categoria")
            );
        }

        if (nextEndsAt && nextEndsAt <= nextStartsAt) {
            return left(AppError.business("Fim da promocao deve ser posterior ao inicio"));
        }

        const slug = input.name ? slugify(input.name) : undefined;
        if (slug && slug !== existing.slug) {
            const conflict = await this.marketingRepository.findPromotionBySlug(slug);
            if (conflict && conflict.uuid !== existing.uuid) {
                return left(AppError.conflict("Ja existe uma promocao com este nome"));
            }
        }

        const promotion = await this.marketingRepository.updatePromotionByUuid(promotionUuid, {
            ...(input.name ? { name: input.name.trim(), slug } : {}),
            ...(input.scope ? { scope: input.scope } : {}),
            category: nextScope === "ALL_PRODUCTS" ? null : nextCategory,
            ...(typeof input.discountPercent === "number"
                ? { discountPercent: input.discountPercent }
                : {}),
            ...(input.startsAt ? { startsAt: input.startsAt } : {}),
            ...(input.endsAt !== undefined ? { endsAt: input.endsAt } : {}),
            ...(typeof input.isActive === "boolean" ? { isActive: input.isActive } : {})
        });

        return right({
            promotion: presentPromotion(promotion)
        });
    }
}
