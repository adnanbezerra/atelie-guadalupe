"use client";

import { startTransition, useCallback, useEffect, useState } from "react";
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
import type { Cart } from "@/lib/types";
import { useApiToken } from "@/hooks/use-api-token";

export function useCart(initialCart: Cart | null = null) {
    const token = useApiToken();
    const [cart, setCart] = useState<Cart | null>(initialCart);
    const [isLoading, setIsLoading] = useState(initialCart == null);
    const [isMutating, setIsMutating] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const refresh = useCallback(async () => {
        if (!token) {
            setIsLoading(false);
            setError("Faça login para visualizar o carrinho.");
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

    async function runMutation(action: () => Promise<{ cart: Cart }>) {
        try {
            setIsMutating(true);
            setError(null);
            const response = await action();
            startTransition(() => {
                setCart(response.cart);
            });
        } catch (err) {
            if (err instanceof ApiError) {
                setError(err.message);
                return;
            }
            setError("Falha ao atualizar o carrinho.");
        } finally {
            setIsMutating(false);
        }
    }

    return {
        cart,
        data: cart,
        isLoading,
        isPending: isMutating,
        isMutating,
        error,
        refresh,
        addItem: async (input: {
            productUuid: string;
            productSize: string;
            quantity: number;
        }) => {
            if (!token) {
                setError("Faça login para adicionar itens.");
                return;
            }
            await runMutation(() => createCartItem(token, input));
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
    };
}
