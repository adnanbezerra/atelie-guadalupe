import { Prisma, PrismaClient } from "../../../generated/prisma/client";
import { PaymentLinkStatus } from "../../../generated/prisma/enums";
import { Either, left, right } from "../../../core/either/either";
import { AppError } from "../../../core/errors/app-error";
import { createUuid } from "../../../core/utils/uuid";
import { CreatePaymentLinkInput, ListPaymentLinksInput } from "../payment-link-schema";
import { AbacateCheckout, AbacatePayClient } from "./abacatepay-client";

const paymentLinkExternalId = (uuid: string) => `payment-link:${uuid}`;

function presentPaymentLink(link: {
    uuid: string;
    amountInCents: number;
    description: string;
    expiresAt: Date | null;
    status: PaymentLinkStatus;
    providerCheckoutId: string | null;
    checkoutUrl: string | null;
    paidAmountInCents: number | null;
    providerMethod: string | null;
    refundPublicId: string | null;
    refundReason: string | null;
    paidAt: Date | null;
    refundedAt: Date | null;
    disputedAt: Date | null;
    lostAt: Date | null;
    createdAt: Date;
    updatedAt: Date;
    createdBy: { uuid: string; name: string; email: string };
}) {
    const configuredBaseUrl = process.env.PAYMENT_LINK_PUBLIC_BASE_URL?.replace(/\/$/, "");

    return {
        uuid: link.uuid,
        amountInCents: link.amountInCents,
        description: link.description,
        expiresAt: link.expiresAt,
        status: link.status,
        paymentUrl: configuredBaseUrl ? `${configuredBaseUrl}/${link.uuid}` : null,
        paymentPath: `/payment-links/${link.uuid}/payment`,
        providerCheckoutId: link.providerCheckoutId,
        checkoutUrl: link.checkoutUrl,
        paidAmountInCents: link.paidAmountInCents,
        providerMethod: link.providerMethod,
        refundPublicId: link.refundPublicId,
        refundReason: link.refundReason,
        paidAt: link.paidAt,
        refundedAt: link.refundedAt,
        disputedAt: link.disputedAt,
        lostAt: link.lostAt,
        createdBy: link.createdBy,
        createdAt: link.createdAt,
        updatedAt: link.updatedAt
    };
}

function presentPublicPaymentLink(link: {
    uuid: string;
    amountInCents: number;
    description: string;
    expiresAt: Date | null;
    status: PaymentLinkStatus;
}) {
    return {
        uuid: link.uuid,
        amountInCents: link.amountInCents,
        description: link.description,
        expiresAt: link.expiresAt,
        status: link.status
    };
}

export class PaymentLinkService {
    public constructor(
        private readonly prisma: PrismaClient,
        private readonly abacatePay: AbacatePayClient
    ) {}

    public async create(
        currentUserUuid: string,
        input: CreatePaymentLinkInput
    ): Promise<Either<AppError, { paymentLink: ReturnType<typeof presentPaymentLink> }>> {
        const createdBy = await this.prisma.user.findUnique({
            where: { uuid: currentUserUuid }
        });
        if (!createdBy) return left(AppError.notFound("Usuario nao encontrado"));

        const expiresAt = input.expiresAt ? new Date(input.expiresAt) : null;
        if (expiresAt && expiresAt <= new Date()) {
            return left(AppError.validation("A expiracao precisa estar no futuro"));
        }

        const uuid = createUuid();
        const providerProduct = await this.abacatePay.createProduct({
            externalId: paymentLinkExternalId(uuid),
            name: `Cobranca ${uuid.slice(0, 8)}`,
            price: input.amountInCents,
            description: input.description
        });
        const paymentLink = await this.prisma.paymentLink.create({
            data: {
                uuid,
                createdById: createdBy.id,
                amountInCents: input.amountInCents,
                description: input.description,
                expiresAt,
                providerProductId: providerProduct.id,
                providerProductResponse: providerProduct as unknown as Prisma.InputJsonValue
            },
            include: { createdBy: { select: { uuid: true, name: true, email: true } } }
        });

        return right({ paymentLink: presentPaymentLink(paymentLink) });
    }

    public async pay(
        uuid: string
    ): Promise<
        Either<
            AppError,
            { checkoutUrl: string; paymentLink: ReturnType<typeof presentPublicPaymentLink> }
        >
    > {
        let paymentLink = await this.findByUuid(uuid);
        if (!paymentLink) return left(AppError.notFound("Link de pagamento nao encontrado"));

        if (
            paymentLink.expiresAt &&
            paymentLink.expiresAt <= new Date() &&
            (paymentLink.status === PaymentLinkStatus.ACTIVE ||
                paymentLink.status === PaymentLinkStatus.CREATING ||
                paymentLink.status === PaymentLinkStatus.PENDING)
        ) {
            paymentLink = await this.prisma.paymentLink.update({
                where: { id: paymentLink.id },
                data: { status: PaymentLinkStatus.EXPIRED },
                include: { createdBy: { select: { uuid: true, name: true, email: true } } }
            });
        }

        if (paymentLink.status === PaymentLinkStatus.EXPIRED) {
            return left(AppError.business("Link de pagamento expirado"));
        }
        if (paymentLink.status === PaymentLinkStatus.PAID) {
            return left(AppError.business("Link de pagamento ja foi pago"));
        }
        if (paymentLink.checkoutUrl) {
            return right({
                checkoutUrl: paymentLink.checkoutUrl,
                paymentLink: presentPublicPaymentLink(paymentLink)
            });
        }
        if (paymentLink.status === PaymentLinkStatus.CREATING) {
            const checkout = await this.abacatePay.findCheckoutByExternalId(
                paymentLinkExternalId(uuid)
            );
            if (checkout)
                return this.saveCheckout(paymentLink.id, paymentLink.amountInCents, checkout);
            return left(
                AppError.conflict("A criacao do checkout ainda esta em andamento; tente novamente")
            );
        }
        if (paymentLink.status !== PaymentLinkStatus.ACTIVE) {
            return left(AppError.business("Link de pagamento nao esta disponivel"));
        }

        const locked = await this.prisma.paymentLink.updateMany({
            where: { id: paymentLink.id, status: PaymentLinkStatus.ACTIVE },
            data: { status: PaymentLinkStatus.CREATING }
        });
        if (locked.count !== 1) {
            return left(
                AppError.conflict("A criacao do checkout ja foi iniciada; tente novamente")
            );
        }

        try {
            const checkout = await this.abacatePay.createCheckout({
                externalId: paymentLinkExternalId(uuid),
                items: [{ id: paymentLink.providerProductId, quantity: 1 }],
                methods: ["PIX", "CARD"],
                returnUrl: process.env.ABACATEPAY_RETURN_URL,
                completionUrl: process.env.ABACATEPAY_COMPLETION_URL,
                metadata: { paymentLinkUuid: uuid }
            });
            return this.saveCheckout(paymentLink.id, paymentLink.amountInCents, checkout);
        } catch (error) {
            await this.prisma.paymentLink.updateMany({
                where: { id: paymentLink.id, status: PaymentLinkStatus.CREATING },
                data: { status: PaymentLinkStatus.ACTIVE }
            });
            throw error;
        }
    }

    public async list(query: ListPaymentLinksInput) {
        await this.prisma.paymentLink.updateMany({
            where: {
                status: {
                    in: [
                        PaymentLinkStatus.ACTIVE,
                        PaymentLinkStatus.CREATING,
                        PaymentLinkStatus.PENDING
                    ]
                },
                expiresAt: { lte: new Date() }
            },
            data: { status: PaymentLinkStatus.EXPIRED }
        });

        const where = query.status ? { status: query.status } : {};
        const [items, total] = await this.prisma.$transaction([
            this.prisma.paymentLink.findMany({
                where,
                include: { createdBy: { select: { uuid: true, name: true, email: true } } },
                orderBy: { createdAt: "desc" },
                skip: (query.page - 1) * query.pageSize,
                take: query.pageSize
            }),
            this.prisma.paymentLink.count({ where })
        ]);

        return right({
            items: items.map(presentPaymentLink),
            pagination: {
                page: query.page,
                pageSize: query.pageSize,
                total,
                totalPages: Math.ceil(total / query.pageSize) || 1
            }
        });
    }

    private findByUuid(uuid: string) {
        return this.prisma.paymentLink.findUnique({
            where: { uuid },
            include: { createdBy: { select: { uuid: true, name: true, email: true } } }
        });
    }

    private async saveCheckout(
        paymentLinkId: number,
        expectedAmount: number,
        checkout: AbacateCheckout
    ) {
        if (checkout.amount !== expectedAmount) {
            await this.prisma.paymentLink.update({
                where: { id: paymentLinkId },
                data: { status: PaymentLinkStatus.ACTIVE }
            });
            return left(AppError.business("O total retornado pela AbacatePay diverge da cobranca"));
        }

        const updated = await this.prisma.paymentLink.update({
            where: { id: paymentLinkId },
            data: {
                status: PaymentLinkStatus.PENDING,
                providerCheckoutId: checkout.id,
                checkoutUrl: checkout.url,
                providerCheckoutResponse: checkout as unknown as Prisma.InputJsonValue
            },
            include: { createdBy: { select: { uuid: true, name: true, email: true } } }
        });
        return right({
            checkoutUrl: checkout.url,
            paymentLink: presentPublicPaymentLink(updated)
        });
    }
}
