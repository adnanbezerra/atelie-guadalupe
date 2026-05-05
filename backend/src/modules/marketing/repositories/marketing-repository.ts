import { Coupon, Prisma, PrismaClient, Promotion } from "../../../generated/prisma/client";
import { ProductCategory, PromotionScope } from "../../../generated/prisma/enums";

const couponInclude = {
    emailSegments: {
        orderBy: {
            email: "asc" as const
        }
    },
    redemptions: true
} as const;

type CreateCouponInput = {
    uuid: string;
    code: string;
    discountPercent: number;
    validUntil?: Date | null;
    maxUses: number;
    emails: string[];
    stackableWithPromotions: boolean;
    isActive: boolean;
};

type UpdateCouponInput = Partial<Omit<CreateCouponInput, "uuid" | "emails">> & {
    emails?: string[];
};

type CreatePromotionInput = {
    uuid: string;
    name: string;
    slug: string;
    scope: PromotionScope;
    category?: ProductCategory | null;
    discountPercent: number;
    startsAt: Date;
    endsAt?: Date | null;
    isActive: boolean;
};

type UpdatePromotionInput = Partial<Omit<CreatePromotionInput, "uuid">>;

export type CouponWithRelations = Coupon & {
    emailSegments: Array<{
        email: string;
    }>;
    redemptions: unknown[];
};

export class MarketingRepository {
    public constructor(private readonly prisma: PrismaClient) {}

    public listCoupons() {
        return this.prisma.coupon.findMany({
            include: couponInclude,
            orderBy: {
                createdAt: "desc"
            }
        }) as Promise<CouponWithRelations[]>;
    }

    public findCouponByUuid(uuid: string) {
        return this.prisma.coupon.findUnique({
            where: {
                uuid
            },
            include: couponInclude
        }) as Promise<CouponWithRelations | null>;
    }

    public findCouponByCode(code: string) {
        return this.prisma.coupon.findUnique({
            where: {
                code
            },
            include: couponInclude
        }) as Promise<CouponWithRelations | null>;
    }

    public countCouponRedemptions(couponId: number) {
        return this.prisma.couponRedemption.count({
            where: {
                couponId
            }
        });
    }

    public findCouponRedemption(couponId: number, userId: number) {
        return this.prisma.couponRedemption.findUnique({
            where: {
                couponId_userId: {
                    couponId,
                    userId
                }
            }
        });
    }

    public createCoupon(input: CreateCouponInput) {
        return this.prisma.coupon.create({
            data: {
                uuid: input.uuid,
                code: input.code,
                discountPercent: input.discountPercent,
                validUntil: input.validUntil,
                maxUses: input.maxUses,
                stackableWithPromotions: input.stackableWithPromotions,
                isActive: input.isActive,
                emailSegments: {
                    create: input.emails.map((email) => ({
                        email
                    }))
                }
            },
            include: couponInclude
        }) as Promise<CouponWithRelations>;
    }

    public updateCouponByUuid(uuid: string, input: UpdateCouponInput) {
        const { emails, ...couponData } = input;

        return this.prisma.coupon.update({
            where: {
                uuid
            },
            data: {
                ...couponData,
                ...(emails
                    ? {
                          emailSegments: {
                              deleteMany: {},
                              create: emails.map((email) => ({
                                  email
                              }))
                          }
                      }
                    : {})
            },
            include: couponInclude
        }) as Promise<CouponWithRelations>;
    }

    public cancelCouponByUuid(uuid: string) {
        return this.prisma.coupon.update({
            where: {
                uuid
            },
            data: {
                isActive: false,
                cancelledAt: new Date()
            },
            include: couponInclude
        }) as Promise<CouponWithRelations>;
    }

    public listPromotions() {
        return this.prisma.promotion.findMany({
            orderBy: {
                createdAt: "desc"
            }
        });
    }

    public findPromotionByUuid(uuid: string) {
        return this.prisma.promotion.findUnique({
            where: {
                uuid
            }
        });
    }

    public findPromotionBySlug(slug: string) {
        return this.prisma.promotion.findUnique({
            where: {
                slug
            }
        });
    }

    public createPromotion(input: CreatePromotionInput) {
        return this.prisma.promotion.create({
            data: input
        });
    }

    public updatePromotionByUuid(uuid: string, input: UpdatePromotionInput) {
        return this.prisma.promotion.update({
            where: {
                uuid
            },
            data: input
        });
    }

    public findBestActivePromotionForCategory(category: ProductCategory, now = new Date()) {
        return this.prisma.promotion.findFirst({
            where: {
                isActive: true,
                startsAt: {
                    lte: now
                },
                OR: [
                    {
                        endsAt: null
                    },
                    {
                        endsAt: {
                            gt: now
                        }
                    }
                ],
                AND: [
                    {
                        OR: [
                            {
                                scope: "ALL_PRODUCTS"
                            },
                            {
                                scope: "CATEGORY",
                                category
                            }
                        ]
                    }
                ]
            },
            orderBy: [
                {
                    discountPercent: "desc"
                },
                {
                    createdAt: "desc"
                }
            ]
        }) as Promise<Promotion | null>;
    }

    public createCouponRedemption(input: Prisma.CouponRedemptionUncheckedCreateInput) {
        return this.prisma.couponRedemption.create({
            data: input
        });
    }
}
