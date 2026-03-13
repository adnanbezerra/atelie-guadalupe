import { OrderStatus, RoleName } from "../../../generated/prisma/enums";
import { Either, left, right } from "../../../core/either/either";
import { AppError } from "../../../core/errors/app-error";
import { createUuid } from "../../../core/utils/uuid";
import { AddressRepository } from "../../addresses/repositories/address-repository";
import { CartRepository } from "../../carts/repositories/cart-repository";
import { UserRepository } from "../../users/repositories/user-repository";
import { OrderRepository } from "../repositories/order-repository";
import { presentOrder } from "./order-presenter";

type CreateOrderInput = {
    addressUuid?: string;
    notes?: string;
};

type CurrentUser = {
    sub: string;
    role: RoleName;
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
        private readonly orderRepository: OrderRepository
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

            if (item.product.stock < item.quantity) {
                return left(AppError.business("O carrinho possui itens com estoque insuficiente"));
            }
        }

        const subtotalInCents = cart.items.reduce(
            (total, item) => total + item.product.priceInCents * item.quantity,
            0
        );
        const shippingInCents = 0;
        const discountInCents = 0;
        const totalInCents = subtotalInCents + shippingInCents - discountInCents;

        const order = await this.orderRepository.create({
            uuid: createUuid(),
            userId: user.id,
            addressId,
            status: OrderStatus.PENDING,
            subtotalInCents,
            shippingInCents,
            discountInCents,
            totalInCents,
            notes: input.notes?.trim(),
            placedAt: new Date(),
            items: cart.items.map((item) => {
                return {
                    uuid: createUuid(),
                    productId: item.product.id,
                    productNameSnapshot: item.product.name,
                    imageUrlSnapshot: item.product.imageUrl,
                    quantity: item.quantity,
                    unitPriceInCents: item.product.priceInCents,
                    totalPriceInCents: item.product.priceInCents * item.quantity
                };
            })
        });

        for (const item of cart.items) {
            await this.cartRepository.deleteItemByUuid(item.uuid);
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
}
