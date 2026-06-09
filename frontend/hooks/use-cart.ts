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
import type { Cart, CartItem, Order, Product } from "@/lib/types";
import { useApiToken } from "@/hooks/use-api-token";
import { applyProductDiscount } from "@/lib/utils";

const GUEST_CART_STORAGE_KEY = "atelie_guest_cart";

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
    dismissError: () => void;
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

function createEmptyGuestCart(): Cart {
    return {
        uuid: "guest-cart",
        items: [],
        coupon: null,
        summary: {
            itemsCount: 0,
            subtotalInCents: 0,
            couponDiscountInCents: 0,
            totalInCents: 0,
        },
    };
}

function summarizeCartItems(items: CartItem[]): Cart["summary"] {
    const subtotalInCents = items.reduce(
        (total, item) => total + item.totalPriceInCents,
        0,
    );
    const itemsCount = items.reduce((total, item) => total + item.quantity, 0);

    return {
        itemsCount,
        subtotalInCents,
        couponDiscountInCents: 0,
        totalInCents: subtotalInCents,
    };
}

function buildGuestCart(items: CartItem[]): Cart {
    return {
        uuid: "guest-cart",
        items,
        coupon: null,
        summary: summarizeCartItems(items),
    };
}

function readGuestCart() {
    if (typeof window === "undefined") {
        return createEmptyGuestCart();
    }

    const rawCart = window.sessionStorage.getItem(GUEST_CART_STORAGE_KEY);

    if (!rawCart) {
        return createEmptyGuestCart();
    }

    try {
        const parsed = JSON.parse(rawCart) as Cart;

        if (!Array.isArray(parsed.items)) {
            return createEmptyGuestCart();
        }

        return buildGuestCart(parsed.items);
    } catch {
        return createEmptyGuestCart();
    }
}

function writeGuestCart(cart: Cart) {
    if (typeof window === "undefined") {
        return;
    }

    if (cart.items.length === 0) {
        clearGuestCart();
        return;
    }

    window.sessionStorage.setItem(GUEST_CART_STORAGE_KEY, JSON.stringify(cart));
}

function clearGuestCart() {
    if (typeof window === "undefined") {
        return;
    }

    window.sessionStorage.removeItem(GUEST_CART_STORAGE_KEY);
}

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
    const unitPriceInCents = applyProductDiscount(
        priceOption.priceInCents,
        product.promotionDiscountPercent,
    );
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
            category: product.category,
            productSize: input.productSize,
            grams: priceOption.grams,
            quantity: input.quantity,
            unitPriceInCents,
            totalPriceInCents: unitPriceInCents * input.quantity,
            activePromotion: product.activePromotion,
            promotionDiscountPercent: product.promotionDiscountPercent ?? 0,
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
    const syncedGuestCartTokenRef = useRef<string | null>(null);

    useEffect(() => {
        latestCartRef.current = cart;
    }, [cart]);

    const refresh = useCallback(async () => {
        if (!token) {
            const guestCart = readGuestCart();

            latestCartRef.current = guestCart;
            setCart(guestCart);
            setIsLoading(false);
            setError(null);
            return;
        }

        try {
            setIsLoading(true);
            setError(null);
            const guestCart = readGuestCart();

            if (
                guestCart.items.length > 0 &&
                syncedGuestCartTokenRef.current !== token
            ) {
                for (const item of guestCart.items) {
                    await createCartItem(token, {
                        productSize: item.productSize,
                        productUuid: item.productUuid,
                        quantity: item.quantity,
                    });
                }

                clearGuestCart();
                syncedGuestCartTokenRef.current = token;
            }

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

    function updateGuestCart(nextCart: Cart) {
        latestCartRef.current = nextCart;
        writeGuestCart(nextCart);
        startTransition(() => {
            setCart(nextCart);
        });
    }

    const value = useMemo<CartContextValue>(
        () => ({
            cart,
            data: cart,
            isLoading,
            isPending: isMutating,
            isMutating,
            error,
            dismissError: () => setError(null),
            refresh,
            hydrate,
            addItem: async (input: AddCartItemInput) => {
                if (!token) {
                    const nextCart = getOptimisticCart(
                        latestCartRef.current ?? readGuestCart(),
                        input,
                    );

                    if (!nextCart) {
                        const message =
                            "Não foi possível adicionar este produto.";
                        setError(message);
                        return message;
                    }

                    setError(null);
                    updateGuestCart(nextCart);
                    return null;
                }

                const payload = {
                    productSize: input.productSize,
                    productUuid: input.productUuid,
                    quantity: input.quantity,
                };

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
                if (quantity <= 0) {
                    if (!token) {
                        const currentCart =
                            latestCartRef.current ?? readGuestCart();
                        const nextItems = currentCart.items.filter(
                            (item) => item.uuid !== itemUuid,
                        );

                        updateGuestCart(buildGuestCart(nextItems));
                        return;
                    }

                    await runMutation(() => removeCartItem(token, itemUuid));
                    return;
                }

                if (!token) {
                    const currentCart =
                        latestCartRef.current ?? readGuestCart();
                    const nextItems = currentCart.items.map((item) =>
                        item.uuid === itemUuid
                            ? {
                                  ...item,
                                  productSize:
                                      productSize ?? item.productSize,
                                  quantity,
                                  totalPriceInCents:
                                      item.unitPriceInCents * quantity,
                              }
                            : item,
                    );

                    updateGuestCart(buildGuestCart(nextItems));
                    return;
                }
                await runMutation(() =>
                    updateCartItem(token, itemUuid, { quantity, productSize }),
                );
            },
            removeItem: async (itemUuid: string) => {
                if (!token) {
                    const currentCart =
                        latestCartRef.current ?? readGuestCart();
                    const nextItems = currentCart.items.filter(
                        (item) => item.uuid !== itemUuid,
                    );

                    updateGuestCart(buildGuestCart(nextItems));
                    return;
                }
                await runMutation(() => removeCartItem(token, itemUuid));
            },
            clear: async () => {
                if (!token) {
                    updateGuestCart(createEmptyGuestCart());
                    return;
                }
                await runMutation(() => clearCart(token));
            },
            clearCart: async () => {
                if (!token) {
                    updateGuestCart(createEmptyGuestCart());
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
        }),
        [cart, error, hydrate, isLoading, isMutating, refresh, token],
    );

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
