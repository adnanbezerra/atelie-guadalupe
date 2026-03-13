import { Either, left, right } from "../../../core/either/either";
import { AppError } from "../../../core/errors/app-error";
import { createUuid } from "../../../core/utils/uuid";
import { ProductRepository } from "../../products/repositories/product-repository";
import { UserRepository } from "../../users/repositories/user-repository";
import { CartRepository } from "../repositories/cart-repository";
import { presentCart } from "./cart-presenter";

type AddCartItemInput = {
    productUuid: string;
    quantity: number;
};

type UpdateCartItemInput = {
    quantity: number;
};

export class CartService {
    public constructor(
        private readonly userRepository: UserRepository,
        private readonly productRepository: ProductRepository,
        private readonly cartRepository: CartRepository
    ) {}

    public async getMyCart(
        userUuid: string
    ): Promise<Either<AppError, { cart: ReturnType<typeof presentCart> }>> {
        const user = await this.userRepository.findByUuid(userUuid);
        if (!user) {
            return left(AppError.notFound("Usuario nao encontrado"));
        }

        const cart = await this.getOrCreateCart(user.id);

        return right({
            cart: presentCart(cart)
        });
    }

    public async addItem(
        userUuid: string,
        input: AddCartItemInput
    ): Promise<Either<AppError, { cart: ReturnType<typeof presentCart> }>> {
        const user = await this.userRepository.findByUuid(userUuid);
        if (!user) {
            return left(AppError.notFound("Usuario nao encontrado"));
        }

        const product = await this.productRepository.findByUuid(input.productUuid);
        if (!product || !product.isActive) {
            return left(AppError.notFound("Produto nao encontrado"));
        }

        if (product.stock < input.quantity) {
            return left(AppError.business("Quantidade solicitada maior que o estoque disponivel"));
        }

        const cart = await this.getOrCreateCart(user.id);
        const existingItem = await this.cartRepository.findItemByCartAndProduct(
            cart.id,
            product.id
        );

        if (existingItem) {
            const nextQuantity = existingItem.quantity + input.quantity;
            if (product.stock < nextQuantity) {
                return left(
                    AppError.business("Quantidade solicitada maior que o estoque disponivel")
                );
            }

            await this.cartRepository.updateItemByUuid(existingItem.uuid, {
                quantity: nextQuantity,
                unitPriceInCents: product.priceInCents,
                productNameSnapshot: product.name
            });
        } else {
            await this.cartRepository.createItem({
                uuid: createUuid(),
                cartId: cart.id,
                productId: product.id,
                quantity: input.quantity,
                unitPriceInCents: product.priceInCents,
                productNameSnapshot: product.name
            });
        }

        const updatedCart = await this.getOrCreateCart(user.id);

        return right({
            cart: presentCart(updatedCart)
        });
    }

    public async updateItem(
        userUuid: string,
        cartItemUuid: string,
        input: UpdateCartItemInput
    ): Promise<Either<AppError, { cart: ReturnType<typeof presentCart> }>> {
        const user = await this.userRepository.findByUuid(userUuid);
        if (!user) {
            return left(AppError.notFound("Usuario nao encontrado"));
        }

        const cart = await this.getOrCreateCart(user.id);
        const item = await this.cartRepository.findItemByUuid(cartItemUuid);

        if (!item || item.cart.userId !== user.id) {
            return left(AppError.notFound("Item do carrinho nao encontrado"));
        }

        if (!item.product.isActive) {
            return left(AppError.business("Produto indisponivel"));
        }

        if (item.product.stock < input.quantity) {
            return left(AppError.business("Quantidade solicitada maior que o estoque disponivel"));
        }

        await this.cartRepository.updateItemByUuid(cartItemUuid, {
            quantity: input.quantity,
            unitPriceInCents: item.product.priceInCents,
            productNameSnapshot: item.product.name
        });

        const updatedCart = await this.getOrCreateCart(cart.userId);

        return right({
            cart: presentCart(updatedCart)
        });
    }

    public async removeItem(
        userUuid: string,
        cartItemUuid: string
    ): Promise<Either<AppError, { cart: ReturnType<typeof presentCart> }>> {
        const user = await this.userRepository.findByUuid(userUuid);
        if (!user) {
            return left(AppError.notFound("Usuario nao encontrado"));
        }

        const cart = await this.getOrCreateCart(user.id);
        const item = await this.cartRepository.findItemByUuid(cartItemUuid);

        if (!item || item.cart.userId !== user.id) {
            return left(AppError.notFound("Item do carrinho nao encontrado"));
        }

        await this.cartRepository.deleteItemByUuid(cartItemUuid);

        const updatedCart = await this.getOrCreateCart(cart.userId);

        return right({
            cart: presentCart(updatedCart)
        });
    }

    public async clear(
        userUuid: string
    ): Promise<Either<AppError, { cart: ReturnType<typeof presentCart> }>> {
        const user = await this.userRepository.findByUuid(userUuid);
        if (!user) {
            return left(AppError.notFound("Usuario nao encontrado"));
        }

        const cart = await this.getOrCreateCart(user.id);
        await this.cartRepository.clearCart(cart.id);

        const updatedCart = await this.getOrCreateCart(cart.userId);

        return right({
            cart: presentCart(updatedCart)
        });
    }

    private async getOrCreateCart(userId: number) {
        const existingCart = await this.cartRepository.findByUserId(userId);
        if (existingCart) {
            return existingCart;
        }

        return this.cartRepository.create({
            uuid: createUuid(),
            userId
        });
    }
}
