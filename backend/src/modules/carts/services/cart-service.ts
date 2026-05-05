import { ProductSize } from "../../../generated/prisma/enums";
import { Either, left, right } from "../../../core/either/either";
import { AppError } from "../../../core/errors/app-error";
import { createUuid } from "../../../core/utils/uuid";
import { MarketingRepository } from "../../marketing/repositories/marketing-repository";
import { applyPercentDiscount } from "../../marketing/services/discounts";
import { ProductRepository } from "../../products/repositories/product-repository";
import { calculateProductPriceInCents } from "../../products/services/product-pricing";
import { hasAvailableStock, ProductCategory } from "../../products/services/product-stock";
import { UserRepository } from "../../users/repositories/user-repository";
import { CartRepository } from "../repositories/cart-repository";
import { presentCart } from "./cart-presenter";

type AddCartItemInput = {
    productUuid: string;
    productSize: ProductSize;
    quantity: number;
};

type UpdateCartItemInput = {
    quantity: number;
    productSize?: ProductSize;
};

type ApplyCouponInput = {
    code: string;
};

type CartWithItemsAndCoupon = NonNullable<Awaited<ReturnType<CartRepository["findByUserId"]>>>;

export class CartService {
    public constructor(
        private readonly userRepository: UserRepository,
        private readonly productRepository: ProductRepository,
        private readonly cartRepository: CartRepository,
        private readonly marketingRepository: MarketingRepository
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
            cart: presentCart(await this.sanitizeCartCoupon(user, cart))
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

        if (!hasAvailableStock(product.category, product.stock, input.quantity)) {
            return left(AppError.business("Quantidade solicitada maior que o estoque disponivel"));
        }

        const cart = await this.getOrCreateCart(user.id);
        const existingItem = await this.cartRepository.findItemByCartAndProduct(
            cart.id,
            product.id,
            input.productSize
        );

        const unitPriceInCents = await this.calculateCurrentUnitPrice(
            product.line,
            input.productSize,
            product.category
        );

        if (existingItem) {
            const nextQuantity = existingItem.quantity + input.quantity;
            if (!hasAvailableStock(product.category, product.stock, nextQuantity)) {
                return left(
                    AppError.business("Quantidade solicitada maior que o estoque disponivel")
                );
            }

            await this.cartRepository.updateItemByUuid(existingItem.uuid, {
                productSize: input.productSize,
                quantity: nextQuantity,
                unitPriceInCents,
                productNameSnapshot: product.name
            });
        } else {
            await this.cartRepository.createItem({
                uuid: createUuid(),
                cartId: cart.id,
                productId: product.id,
                productSize: input.productSize,
                quantity: input.quantity,
                unitPriceInCents,
                productNameSnapshot: product.name
            });
        }

        const updatedCart = await this.getOrCreateCart(user.id);

        return right({
            cart: presentCart(await this.sanitizeCartCoupon(user, updatedCart))
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

        if (!hasAvailableStock(item.product.category, item.product.stock, input.quantity)) {
            return left(AppError.business("Quantidade solicitada maior que o estoque disponivel"));
        }

        const nextProductSize = input.productSize ?? item.productSize;
        const nextUnitPriceInCents = await this.calculateCurrentUnitPrice(
            item.product.line,
            nextProductSize,
            item.product.category
        );

        if (nextProductSize !== item.productSize) {
            const conflictingItem = await this.cartRepository.findItemByCartAndProduct(
                cart.id,
                item.productId,
                nextProductSize
            );

            if (conflictingItem && conflictingItem.uuid !== item.uuid) {
                const nextQuantity = conflictingItem.quantity + input.quantity;
                if (!hasAvailableStock(item.product.category, item.product.stock, nextQuantity)) {
                    return left(
                        AppError.business("Quantidade solicitada maior que o estoque disponivel")
                    );
                }

                await this.cartRepository.updateItemByUuid(conflictingItem.uuid, {
                    quantity: nextQuantity,
                    unitPriceInCents: nextUnitPriceInCents,
                    productNameSnapshot: item.product.name
                });
                await this.cartRepository.deleteItemByUuid(item.uuid);

                const mergedCart = await this.getOrCreateCart(cart.userId);

                return right({
                    cart: presentCart(await this.sanitizeCartCoupon(user, mergedCart))
                });
            }
        }

        await this.cartRepository.updateItemByUuid(cartItemUuid, {
            productSize: nextProductSize,
            quantity: input.quantity,
            unitPriceInCents: nextUnitPriceInCents,
            productNameSnapshot: item.product.name
        });

        const updatedCart = await this.getOrCreateCart(cart.userId);

        return right({
            cart: presentCart(await this.sanitizeCartCoupon(user, updatedCart))
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
            cart: presentCart(await this.sanitizeCartCoupon(user, updatedCart))
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
        await this.cartRepository.updateCoupon(cart.id, null);

        const updatedCart = await this.getOrCreateCart(cart.userId);

        return right({
            cart: presentCart(updatedCart)
        });
    }

    public async applyCoupon(
        userUuid: string,
        input: ApplyCouponInput
    ): Promise<Either<AppError, { cart: ReturnType<typeof presentCart> }>> {
        const user = await this.userRepository.findByUuid(userUuid);
        if (!user) {
            return left(AppError.notFound("Usuario nao encontrado"));
        }

        const cart = await this.getOrCreateCart(user.id);
        if (cart.items.length === 0) {
            return left(AppError.business("Nao e possivel aplicar cupom em carrinho vazio"));
        }

        const coupon = await this.marketingRepository.findCouponByCode(
            input.code.trim().toUpperCase()
        );
        if (!coupon) {
            return left(AppError.notFound("Cupom nao encontrado"));
        }

        const validation = await this.validateCouponForCart(user, coupon, cart.items);
        if (!validation.success) {
            return validation;
        }

        const updatedCart = await this.cartRepository.updateCoupon(cart.id, coupon.id);

        return right({
            cart: presentCart(updatedCart)
        });
    }

    public async removeCoupon(
        userUuid: string
    ): Promise<Either<AppError, { cart: ReturnType<typeof presentCart> }>> {
        const user = await this.userRepository.findByUuid(userUuid);
        if (!user) {
            return left(AppError.notFound("Usuario nao encontrado"));
        }

        const cart = await this.getOrCreateCart(user.id);
        const updatedCart = await this.cartRepository.updateCoupon(cart.id, null);

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

    private async sanitizeCartCoupon(
        user: {
            id: number;
            email: string;
        },
        cart: CartWithItemsAndCoupon
    ) {
        if (!cart.coupon) {
            return cart;
        }

        if (cart.items.length === 0) {
            return this.cartRepository.updateCoupon(cart.id, null);
        }

        const validation = await this.validateCouponForCart(
            user,
            cart.coupon as Parameters<CartService["validateCouponForCart"]>[1],
            cart.items as Parameters<CartService["validateCouponForCart"]>[2]
        );

        if (validation.success) {
            return cart;
        }

        return this.cartRepository.updateCoupon(cart.id, null);
    }

    private async calculateCurrentUnitPrice(
        line: Parameters<typeof calculateProductPriceInCents>[0],
        productSize: ProductSize,
        category: ProductCategory
    ) {
        const basePriceInCents = calculateProductPriceInCents(line, productSize);
        const promotion =
            await this.marketingRepository.findBestActivePromotionForCategory(category);

        if (!promotion) {
            return basePriceInCents;
        }

        return applyPercentDiscount(basePriceInCents, promotion.discountPercent);
    }

    private async validateCouponForCart(
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
        items: Array<{
            product: {
                category: ProductCategory;
            };
        }>
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

        if (!coupon.stackableWithPromotions) {
            for (const item of items) {
                const promotion = await this.marketingRepository.findBestActivePromotionForCategory(
                    item.product.category
                );
                if (promotion) {
                    return left(AppError.business("Cupom nao acumulavel com promocao vigente"));
                }
            }
        }

        return right(true as const);
    }
}
