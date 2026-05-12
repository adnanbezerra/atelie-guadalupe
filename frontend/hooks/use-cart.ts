"use client";

import {
    createContext,
    createElement,
    startTransition,
    useCallback,
    useContext,
    useEffect,
    useMemo,
    useRef,
    useState,
} from "react";
import {
    ApiError,
    applyCartCoupon,
    clearCart,
    createCartItem,
    createOrder,
    getCart,
    removeCartCoupon,
    removeCartItem,
    updateCartItem,
} from "@/lib/api";
import type { ReactNode } from "react";
import type { Cart, Order, Product } from "@/lib/types";
import { useApiToken } from "@/hooks/use-api-token";
import { applyProductDiscount } from "@/lib/utils";

type AddCartItemInput = {
    productUuid: string;
    productSize: string;
    quantity: number;
    optimisticProduct?: Product;
};

type CartContextValue = {
    cart: Cart | null;
    data: Cart | null;
    isLoading: boolean;
    isPending: boolean;
    isMutating: boolean;
    error: string | null;
    refresh: () => Promise<void>;
    hydrate: (cart: Cart | null) => void;
    addItem: (input: AddCartItemInput) => Promise<string | null>;
    updateItem: (
        itemUuid: string,
        quantity: number,
        productSize?: string,
    ) => Promise<void>;
    removeItem: (itemUuid: string) => Promise<void>;
    clear: () => Promise<void>;
    clearCart: () => Promise<void>;
    applyCoupon: (code: string) => Promise<void>;
    removeCoupon: () => Promise<void>;
    checkout: (
        addressUuid?: string,
        notes?: string,
        paymentMethod?: "PIX" | "CREDIT_CARD" | "DEBIT_CARD",
    ) => Promise<Order>;
};

const CartContext = createContext<CartContextValue | null>(null);

function getOptimisticCart(
    currentCart: Cart | null,
    input: AddCartItemInput,
): Cart | null {
    const product = input.optimisticProduct;
    const priceOption = product?.priceOptions.find(
        (option) => option.size === input.productSize,
    );

    if (!product || !priceOption) {
        return currentCart;
    }

    const currentItems = currentCart?.items ?? [];
    const unitPriceInCents = applyProductDiscount(priceOption.priceInCents);
    const itemIndex = currentItems.findIndex(
        (item) =>
            item.productUuid === input.productUuid &&
            item.productSize === input.productSize,
    );
    const nextItems = [...currentItems];

    if (itemIndex >= 0) {
        const item = nextItems[itemIndex];
        const quantity = item.quantity + input.quantity;

        nextItems[itemIndex] = {
            ...item,
            quantity,
            totalPriceInCents: item.unitPriceInCents * quantity,
        };
    } else {
        nextItems.push({
            uuid: `optimistic-${input.productUuid}-${input.productSize}`,
            productUuid: input.productUuid,
            name: product.name,
            productSize: input.productSize,
            grams: priceOption.grams,
            quantity: input.quantity,
            unitPriceInCents,
            totalPriceInCents: unitPriceInCents * input.quantity,
            imageUrl: product.imageUrl,
            isAvailable: product.isActive,
        });
    }

    const subtotalInCents = nextItems.reduce(
        (total, item) => total + item.totalPriceInCents,
        0,
    );
    const itemsCount = nextItems.reduce(
        (total, item) => total + item.quantity,
        0,
    );
    const couponDiscountInCents =
        currentCart?.summary.couponDiscountInCents ?? 0;

    return {
        uuid: currentCart?.uuid ?? "optimistic-cart",
        items: nextItems,
        coupon: currentCart?.coupon ?? null,
        summary: {
            itemsCount,
            subtotalInCents,
            couponDiscountInCents,
            totalInCents: Math.max(0, subtotalInCents - couponDiscountInCents),
        },
    };
}

export function CartProvider({
    children,
    initialCart = null,
}: {
    children: ReactNode;
    initialCart?: Cart | null;
}) {
    const token = useApiToken();
    const [cart, setCart] = useState<Cart | null>(initialCart);
    const [isLoading, setIsLoading] = useState(initialCart == null);
    const [isMutating, setIsMutating] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const latestCartRef = useRef<Cart | null>(initialCart);

    useEffect(() => {
        latestCartRef.current = cart;
    }, [cart]);

    const refresh = useCallback(async () => {
        if (!token) {
            setIsLoading(false);
            setError("Faça login para visualizar o carrinho.");
            setCart(null);
            return;
        }

        try {
            setIsLoading(true);
            setError(null);
            const response = await getCart(token);
            setCart(response.cart);
        } catch (err) {
            setError(
                err instanceof Error
                    ? err.message
                    : "Falha ao carregar carrinho.",
            );
        } finally {
            setIsLoading(false);
        }
    }, [token]);

    useEffect(() => {
        void refresh();
    }, [refresh]);

    const hydrate = useCallback((nextCart: Cart | null) => {
        setCart(nextCart);
        latestCartRef.current = nextCart;
        setIsLoading(false);
    }, []);

    async function runMutation(
        action: () => Promise<{ cart: Cart }>,
        optimisticCart?: Cart | null,
    ): Promise<string | null> {
        const previousCart = latestCartRef.current;

        try {
            setIsMutating(true);
            setError(null);

            if (optimisticCart) {
                latestCartRef.current = optimisticCart;
                startTransition(() => {
                    setCart(optimisticCart);
                });
            }

            const response = await action();
            latestCartRef.current = response.cart;
            startTransition(() => {
                setCart(response.cart);
            });
            return null;
        } catch (err) {
            if (optimisticCart) {
                latestCartRef.current = previousCart;
                startTransition(() => {
                    setCart(previousCart);
                });
            }

            if (err instanceof ApiError) {
                setError(err.message);
                return err.message;
            }
            const message = "Falha ao atualizar o carrinho.";
            setError(message);
            return message;
        } finally {
            setIsMutating(false);
        }
    }

    const value = useMemo<CartContextValue>(() => ({
        cart,
        data: cart,
        isLoading,
        isPending: isMutating,
        isMutating,
        error,
        refresh,
        hydrate,
        addItem: async (input: AddCartItemInput) => {
            if (!token) {
                const message = "Faça login para adicionar itens.";
                setError(message);
                return message;
            }

            const { optimisticProduct: _optimisticProduct, ...payload } =
                input;

            return runMutation(
                () => createCartItem(token, payload),
                getOptimisticCart(latestCartRef.current, input),
            );
        },
        updateItem: async (
            itemUuid: string,
            quantity: number,
            productSize?: string,
        ) => {
            if (!token) {
                setError("Faça login para editar o carrinho.");
                return;
            }
            await runMutation(() =>
                updateCartItem(token, itemUuid, { quantity, productSize }),
            );
        },
        removeItem: async (itemUuid: string) => {
            if (!token) {
                setError("Faça login para editar o carrinho.");
                return;
            }
            await runMutation(() => removeCartItem(token, itemUuid));
        },
        clear: async () => {
            if (!token) {
                setError("Faça login para limpar o carrinho.");
                return;
            }
            await runMutation(() => clearCart(token));
        },
        clearCart: async () => {
            if (!token) {
                setError("Faça login para limpar o carrinho.");
                return;
            }
            await runMutation(() => clearCart(token));
        },
        applyCoupon: async (code: string) => {
            if (!token) {
                setError("Faça login para aplicar cupom.");
                return;
            }
            await runMutation(() => applyCartCoupon(token, code));
        },
        removeCoupon: async () => {
            if (!token) {
                setError("Faça login para remover cupom.");
                return;
            }
            await runMutation(() => removeCartCoupon(token));
        },
        checkout: async (
            addressUuid?: string,
            notes?: string,
            paymentMethod?: "PIX" | "CREDIT_CARD" | "DEBIT_CARD",
        ) => {
            if (!token) {
                setError("Faça login para finalizar o pedido.");
                throw new Error("Faça login para finalizar o pedido.");
            }

            const payload = await createOrder(token, {
                addressUuid,
                notes,
                paymentMethod,
            });
            setCart(null);
            return payload.order;
        },
    }), [cart, error, hydrate, isLoading, isMutating, refresh, token]);

    return createElement(CartContext.Provider, { value }, children);
}

export function useCart(initialCart: Cart | null = null) {
    const context = useContext(CartContext);
    const hydratedRef = useRef(false);

    if (!context) {
        throw new Error("useCart deve ser usado dentro de CartProvider.");
    }

    useEffect(() => {
        if (initialCart && !hydratedRef.current) {
            hydratedRef.current = true;
            context.hydrate(initialCart);
        }
    }, [context, initialCart]);

    return context;
}
