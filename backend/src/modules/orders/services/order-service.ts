import { OrderStatus, PaymentMethod, RoleName } from "../../../generated/prisma/enums";
import { Either, left, right } from "../../../core/either/either";
import { AppError } from "../../../core/errors/app-error";
import { createUuid } from "../../../core/utils/uuid";
import { AddressRepository } from "../../addresses/repositories/address-repository";
import { CartRepository } from "../../carts/repositories/cart-repository";
import { MarketingRepository } from "../../marketing/repositories/marketing-repository";
import {
    applyPercentDiscount,
    calculatePercentDiscountInCents
} from "../../marketing/services/discounts";
import { calculateProductPriceInCents } from "../../products/services/product-pricing";
import { hasAvailableStock } from "../../products/services/product-stock";
import { UserRepository } from "../../users/repositories/user-repository";
import { OrderRepository } from "../repositories/order-repository";
import { presentOrder } from "./order-presenter";

type CreateOrderInput = {
    addressUuid?: string;
    paymentMethod?: PaymentMethod;
    notes?: string;
};

type CurrentUser = {
    sub: string;
    role: RoleName;
};

type PaginationInput = {
    page: number;
    pageSize: number;
};

const allowedStatusTransitions: Record<OrderStatus, OrderStatus[]> = {
    PENDING: ["AWAITING_PAYMENT", "CANCELLED"],
    AWAITING_PAYMENT: ["PAID", "CANCELLED"],
    PAID: ["PROCESSING", "CANCELLED"],
    PROCESSING: ["SHIPPED"],
    SHIPPED: ["DELIVERED"],
    DELIVERED: [],
    CANCELLED: []
};

const userCancellableStatuses: OrderStatus[] = [
    OrderStatus.PENDING,
    OrderStatus.AWAITING_PAYMENT,
    OrderStatus.PAID
];

export class OrderService {
    public constructor(
        private readonly userRepository: UserRepository,
        private readonly addressRepository: AddressRepository,
        private readonly cartRepository: CartRepository,
        private readonly orderRepository: OrderRepository,
        private readonly marketingRepository: MarketingRepository
    ) {}

    public async createFromCart(
        currentUserUuid: string,
        input: CreateOrderInput
    ): Promise<Either<AppError, { order: ReturnType<typeof presentOrder> }>> {
        const user = await this.userRepository.findByUuid(currentUserUuid);
        if (!user) {
            return left(AppError.notFound("Usuario nao encontrado"));
        }

        let addressId: number | undefined;
        if (input.addressUuid) {
            const address = await this.addressRepository.findByUuid(input.addressUuid);
            if (!address || address.userId !== user.id) {
                return left(AppError.notFound("Endereco nao encontrado"));
            }
            addressId = address.id;
        }

        const cart = await this.cartRepository.findByUserId(user.id);
        if (!cart || cart.items.length === 0) {
            return left(AppError.business("Nao e possivel criar pedido com carrinho vazio"));
        }

        for (const item of cart.items) {
            if (!item.product.isActive) {
                return left(AppError.business("O carrinho possui produtos indisponiveis"));
            }

            if (!hasAvailableStock(item.product.category, item.product.stock, item.quantity)) {
                return left(AppError.business("O carrinho possui itens com estoque insuficiente"));
            }
        }

        const pricedItems = [];
        for (const item of cart.items) {
            const baseUnitPriceInCents = calculateProductPriceInCents(
                item.product.line,
                item.productSize
            );
            const promotion = await this.marketingRepository.findBestActivePromotionForCategory(
                item.product.category
            );
            const unitPriceInCents = promotion
                ? applyPercentDiscount(baseUnitPriceInCents, promotion.discountPercent)
                : baseUnitPriceInCents;

            pricedItems.push({
                item,
                baseUnitPriceInCents,
                unitPriceInCents,
                promotionDiscountInCents: (baseUnitPriceInCents - unitPriceInCents) * item.quantity
            });
        }

        const baseSubtotalInCents = pricedItems.reduce(
            (total, pricedItem) =>
                total + pricedItem.baseUnitPriceInCents * pricedItem.item.quantity,
            0
        );
        const promotedSubtotalInCents = pricedItems.reduce(
            (total, pricedItem) => total + pricedItem.unitPriceInCents * pricedItem.item.quantity,
            0
        );
        const subtotalInCents = baseSubtotalInCents;
        const promotionDiscountInCents = baseSubtotalInCents - promotedSubtotalInCents;
        const couponValidation = cart.coupon
            ? await this.validateCouponForOrder(
                  user,
                  cart.coupon,
                  cart.items,
                  promotionDiscountInCents
              )
            : right(true as const);
        if (!couponValidation.success) {
            return couponValidation;
        }

        const couponDiscountInCents = cart.coupon
            ? calculatePercentDiscountInCents(promotedSubtotalInCents, cart.coupon.discountPercent)
            : 0;
        const shippingInCents = 0;
        const discountInCents = promotionDiscountInCents + couponDiscountInCents;
        const totalInCents = subtotalInCents + shippingInCents - discountInCents;

        const orderInput = {
            uuid: createUuid(),
            userId: user.id,
            addressId,
            status: OrderStatus.PENDING,
            subtotalInCents,
            shippingInCents,
            discountInCents,
            promotionDiscountInCents,
            couponDiscountInCents,
            couponId: cart.coupon?.id,
            couponCodeSnapshot: cart.coupon?.code,
            totalInCents,
            paymentMethod: input.paymentMethod,
            notes: input.notes?.trim(),
            placedAt: new Date(),
            items: pricedItems.map((pricedItem) => {
                const item = pricedItem.item;
                return {
                    uuid: createUuid(),
                    productId: item.product.id,
                    productSize: item.productSize,
                    productNameSnapshot: item.product.name,
                    imageUrlSnapshot: item.product.imageUrl,
                    quantity: item.quantity,
                    unitPriceInCents: pricedItem.unitPriceInCents,
                    totalPriceInCents: pricedItem.unitPriceInCents * item.quantity
                };
            })
        };

        let order: Awaited<ReturnType<OrderRepository["createFromCart"]>>;
        try {
            order = await this.orderRepository.createFromCart(
                orderInput,
                {
                    id: cart.id,
                    itemUuids: cart.items.map((item) => item.uuid)
                },
                cart.coupon
                    ? {
                          uuid: createUuid(),
                          couponId: cart.coupon.id,
                          userId: user.id,
                          discountInCents: couponDiscountInCents,
                          codeSnapshot: cart.coupon.code,
                          discountPercentSnapshot: cart.coupon.discountPercent
                      }
                    : undefined,
                cart.coupon
                    ? {
                          couponId: cart.coupon.id,
                          userId: user.id,
                          maxUses: cart.coupon.maxUses
                      }
                    : undefined
            );
        } catch (error) {
            if (error instanceof AppError) {
                return left(error);
            }

            const errorCode =
                error && typeof error === "object" && "code" in error ? error.code : null;
            if (errorCode === "P2002" || errorCode === "P2034") {
                return left(AppError.business("Cupom nao pode ser resgatado neste momento"));
            }

            throw error;
        }

        return right({
            order: presentOrder(order)
        });
    }

    public async list(
        currentUser: CurrentUser
    ): Promise<Either<AppError, { orders: Array<ReturnType<typeof presentOrder>> }>> {
        const user = await this.userRepository.findByUuid(currentUser.sub);
        if (!user) {
            return left(AppError.notFound("Usuario nao encontrado"));
        }

        const orders =
            currentUser.role === RoleName.USER
                ? await this.orderRepository.listByUserId(user.id)
                : await this.orderRepository.listAll();

        return right({
            orders: orders.map((order) => presentOrder(order))
        });
    }

    public async listMine(
        currentUserUuid: string,
        pagination: PaginationInput
    ): Promise<
        Either<
            AppError,
            {
                orders: Array<ReturnType<typeof presentOrder>>;
                pagination: {
                    page: number;
                    pageSize: number;
                    total: number;
                    totalPages: number;
                };
            }
        >
    > {
        const user = await this.userRepository.findByUuid(currentUserUuid);
        if (!user) {
            return left(AppError.notFound("Usuario nao encontrado"));
        }

        const result = await this.orderRepository.listByUserIdPaginated(
            user.id,
            pagination.page,
            pagination.pageSize
        );

        return right({
            orders: result.orders.map((order) => presentOrder(order)),
            pagination: {
                page: pagination.page,
                pageSize: pagination.pageSize,
                total: result.total,
                totalPages: Math.ceil(result.total / pagination.pageSize)
            }
        });
    }

    public async detail(
        currentUser: CurrentUser,
        orderUuid: string
    ): Promise<Either<AppError, { order: ReturnType<typeof presentOrder> }>> {
        const user = await this.userRepository.findByUuid(currentUser.sub);
        if (!user) {
            return left(AppError.notFound("Usuario nao encontrado"));
        }

        const order = await this.orderRepository.findByUuid(orderUuid);
        if (!order) {
            return left(AppError.notFound("Pedido nao encontrado"));
        }

        if (currentUser.role === RoleName.USER && order.userId !== user.id) {
            return left(AppError.forbidden("Usuario sem permissao para acessar este pedido"));
        }

        return right({
            order: presentOrder(order)
        });
    }

    public async updateStatus(
        orderUuid: string,
        nextStatus: OrderStatus
    ): Promise<Either<AppError, { order: ReturnType<typeof presentOrder> }>> {
        const order = await this.orderRepository.findByUuid(orderUuid);
        if (!order) {
            return left(AppError.notFound("Pedido nao encontrado"));
        }

        const allowedTransitions = allowedStatusTransitions[order.status];
        if (!allowedTransitions.includes(nextStatus)) {
            return left(AppError.business("Transicao de status invalida"));
        }

        const updatedOrder = await this.orderRepository.updateStatus(orderUuid, nextStatus);

        return right({
            order: presentOrder(updatedOrder)
        });
    }

    public async cancelOwnOrder(
        currentUserUuid: string,
        orderUuid: string
    ): Promise<Either<AppError, { order: ReturnType<typeof presentOrder> }>> {
        const user = await this.userRepository.findByUuid(currentUserUuid);
        if (!user) {
            return left(AppError.notFound("Usuario nao encontrado"));
        }

        const order = await this.orderRepository.findByUuid(orderUuid);
        if (!order || order.userId !== user.id) {
            return left(AppError.notFound("Pedido nao encontrado"));
        }

        if (!userCancellableStatuses.includes(order.status)) {
            return left(AppError.business("Pedido nao pode mais ser cancelado"));
        }

        const updatedOrder = await this.orderRepository.updateStatus(
            orderUuid,
            OrderStatus.CANCELLED
        );

        return right({
            order: presentOrder(updatedOrder)
        });
    }

    private async validateCouponForOrder(
        user: {
            id: number;
            email: string;
        },
        coupon: {
            id: number;
            isActive: boolean;
            cancelledAt: Date | null;
            validUntil: Date | null;
            maxUses: number;
            stackableWithPromotions: boolean;
            emailSegments: Array<{
                email: string;
            }>;
        },
        _items: unknown[],
        promotionDiscountInCents: number
    ): Promise<Either<AppError, true>> {
        if (!coupon.isActive || coupon.cancelledAt) {
            return left(AppError.business("Cupom cancelado ou inativo"));
        }

        if (coupon.validUntil && coupon.validUntil <= new Date()) {
            return left(AppError.business("Cupom expirado"));
        }

        const usedCount = await this.marketingRepository.countCouponRedemptions(coupon.id);
        if (usedCount >= coupon.maxUses) {
            return left(AppError.business("Cupom atingiu o limite de usos"));
        }

        const existingUse = await this.marketingRepository.findCouponRedemption(coupon.id, user.id);
        if (existingUse) {
            return left(AppError.business("Usuario ja utilizou este cupom"));
        }

        const segmentedEmails = coupon.emailSegments.map((segment) => segment.email);
        if (segmentedEmails.length > 0 && !segmentedEmails.includes(user.email.toLowerCase())) {
            return left(AppError.business("Cupom indisponivel para este email"));
        }

        if (!coupon.stackableWithPromotions && promotionDiscountInCents > 0) {
            return left(AppError.business("Cupom nao acumulavel com promocao vigente"));
        }

        return right(true as const);
    }
}
