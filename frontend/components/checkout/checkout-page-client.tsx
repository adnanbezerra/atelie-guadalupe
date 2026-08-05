"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useCallback, useEffect, useMemo, useState } from "react";
import { ProductImage } from "@/components/shared/product-image";
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog";
import { Skeleton } from "@/components/ui/skeleton";
import { useApiToken } from "@/hooks/use-api-token";
import { useCart } from "@/hooks/use-cart";
import { useUser } from "@/hooks/use-user";
import {
    ApiError,
    confirmOrderShipping,
    createOrderPayment,
    getOrder,
} from "@/lib/api";
import type { Cart, Order } from "@/lib/types";
import { formatCurrency, formatProductSizeLabel } from "@/lib/utils";

type CheckoutPageClientProps = {
    initialCart: Cart | null;
};

type CheckoutError = {
    title: string;
    description: string;
};

const ACTIVE_ORDER_KEY = "atelie_checkout_active_order";
const PAYMENT_CONFIRMED_STATUSES = new Set([
    "PAID",
    "PROCESSING",
    "SHIPPED",
    "DELIVERED",
]);
const PAYMENT_PROBLEM_STATUSES = new Set(["REFUNDED", "DISPUTED", "LOST"]);

function idempotencyStorageKey(orderUuid: string) {
    return `checkout:${orderUuid}:key`;
}

function readStoredOrderUuid() {
    return window.sessionStorage.getItem(ACTIVE_ORDER_KEY);
}

function storeOrder(order: Order) {
    window.sessionStorage.setItem(ACTIVE_ORDER_KEY, order.uuid);

    if (order.paymentIdempotencyKey) {
        window.sessionStorage.setItem(
            idempotencyStorageKey(order.uuid),
            order.paymentIdempotencyKey,
        );
    }
}

function getPaymentMessage(order: Order) {
    if (order.status === "CANCELLED") return "Pedido cancelado";
    if (order.status === "DELIVERED") return "Pedido entregue";
    if (order.status === "SHIPPED") return "Pedido enviado";
    if (order.status === "PROCESSING") {
        return "Pagamento confirmado; preparando envio";
    }
    if (
        PAYMENT_CONFIRMED_STATUSES.has(order.status) ||
        order.payment?.status === "PAID"
    ) {
        return "Pagamento confirmado";
    }
    if (order.payment?.status === "REFUNDED") return "Pagamento reembolsado";
    if (order.payment?.status === "DISPUTED") {
        return "Pagamento em disputa; fale com o atendimento";
    }
    if (order.payment?.status === "LOST") {
        return "Disputa encerrada; fale com o atendimento";
    }
    return "Aguardando confirmação do pagamento";
}

function getDeliveryMessage(order: Order) {
    if (order.status === "DELIVERED") return "Entrega concluída";
    if (order.status === "SHIPPED") return "Seu pedido está a caminho";
    if (
        order.fulfillment?.status === "COMPLETED" ||
        order.shipment?.status === "LABEL_PURCHASED"
    ) {
        return "Etiqueta de envio emitida";
    }
    if (order.fulfillment?.status === "RETRY_SCHEDULED") {
        return "Envio aguardando processamento";
    }
    return "Preparando a etiqueta de envio";
}

export function CheckoutPageClient({ initialCart }: CheckoutPageClientProps) {
    const searchParams = useSearchParams();
    const token = useApiToken();
    const userContext = useUser();
    const cart = useCart(initialCart);
    const [order, setOrder] = useState<Order | null>(null);
    const [notes, setNotes] = useState("");
    const [isRestoring, setIsRestoring] = useState(true);
    const [isPreparing, setIsPreparing] = useState(false);
    const [isRedirecting, setIsRedirecting] = useState(false);
    const [isRefreshing, setIsRefreshing] = useState(false);
    const [isShippingConfirmed, setIsShippingConfirmed] = useState(false);
    const [pollingTimedOut, setPollingTimedOut] = useState(false);
    const [checkoutError, setCheckoutError] = useState<CheckoutError | null>(
        null,
    );

    const serviceCode = Number(searchParams.get("serviceCode"));
    const serviceName = searchParams.get("serviceName") ?? "Entrega";
    const estimatedShipping = Number(
        searchParams.get("shippingPriceInCents") ?? 0,
    );
    const hasValidServiceCode =
        Number.isInteger(serviceCode) && serviceCode > 0;
    const paymentConfirmed = Boolean(
        order &&
        (PAYMENT_CONFIRMED_STATUSES.has(order.status) ||
            order.payment?.status === "PAID"),
    );
    const paymentProblem = Boolean(
        order &&
        (order.status === "CANCELLED" ||
            PAYMENT_PROBLEM_STATUSES.has(order.payment?.status ?? "")),
    );
    const awaitingPayment = Boolean(
        order &&
        !paymentConfirmed &&
        !paymentProblem &&
        (order.status === "AWAITING_PAYMENT" ||
            order.payment?.status === "CREATING" ||
            order.payment?.status === "PENDING"),
    );
    const orderUuid = order?.uuid;

    const showError = useCallback((error: unknown, fallback: string) => {
        let description = error instanceof Error ? error.message : fallback;

        if (error instanceof ApiError) {
            if (error.status === 401) {
                description =
                    "Sua sessão terminou. Entre novamente para continuar.";
            } else if (error.status === 409) {
                description =
                    "O pedido mudou enquanto você finalizava. Atualize os dados e tente novamente.";
            } else if (error.status === 503 || error.status === 502) {
                description =
                    "O pagamento está temporariamente indisponível. Seu pedido foi preservado; tente novamente em instantes.";
            }
        }

        setCheckoutError({
            title: "Não foi possível continuar",
            description,
        });
    }, []);

    const refreshOrder = useCallback(
        async (orderUuid: string, signal?: AbortSignal) => {
            if (!token) return null;

            const response = await getOrder(token, orderUuid, signal);
            storeOrder(response.order);
            setOrder(response.order);
            setIsShippingConfirmed(
                response.order.shipment?.status === "CONFIRMED" ||
                    response.order.shipment?.status === "CHECKOUT_REQUESTED" ||
                    response.order.shipment?.status === "LABEL_PURCHASED",
            );
            return response.order;
        },
        [token],
    );

    useEffect(() => {
        if (!token) {
            setIsRestoring(false);
            return;
        }

        const orderUuidFromUrl = searchParams.get("orderUuid");
        const shouldRestoreStoredOrder = !initialCart?.items.length;
        const orderUuid =
            orderUuidFromUrl ||
            (shouldRestoreStoredOrder ? readStoredOrderUuid() : null);

        if (!orderUuid) {
            setIsRestoring(false);
            return;
        }

        const controller = new AbortController();

        void refreshOrder(orderUuid, controller.signal)
            .catch((error) => {
                if (
                    error instanceof DOMException &&
                    error.name === "AbortError"
                ) {
                    return;
                }
                showError(error, "Não foi possível recuperar seu pedido.");
            })
            .finally(() => setIsRestoring(false));

        return () => controller.abort();
    }, [
        initialCart?.items.length,
        refreshOrder,
        searchParams,
        showError,
        token,
    ]);

    useEffect(() => {
        if (!orderUuid || !token || !awaitingPayment || pollingTimedOut) return;

        const controller = new AbortController();
        const deadline = Date.now() + 2 * 60_000;
        const activeOrderUuid = orderUuid;
        let timeoutId: ReturnType<typeof setTimeout> | undefined;

        async function poll() {
            try {
                const currentOrder = await refreshOrder(
                    activeOrderUuid,
                    controller.signal,
                );

                if (
                    !currentOrder ||
                    PAYMENT_CONFIRMED_STATUSES.has(currentOrder.status) ||
                    currentOrder.payment?.status === "PAID" ||
                    currentOrder.status === "CANCELLED" ||
                    PAYMENT_PROBLEM_STATUSES.has(
                        currentOrder.payment?.status ?? "",
                    )
                ) {
                    return;
                }

                if (Date.now() >= deadline) {
                    setPollingTimedOut(true);
                    return;
                }

                timeoutId = setTimeout(poll, 3000);
            } catch (error) {
                if (
                    !(
                        error instanceof DOMException &&
                        error.name === "AbortError"
                    )
                ) {
                    showError(error, "Não foi possível consultar o pagamento.");
                }
            }
        }

        void poll();

        return () => {
            controller.abort();
            if (timeoutId) clearTimeout(timeoutId);
        };
    }, [
        awaitingPayment,
        orderUuid,
        pollingTimedOut,
        refreshOrder,
        showError,
        token,
    ]);

    async function prepareOrder() {
        if (!token || !userContext.address?.uuid || !hasValidServiceCode) {
            setCheckoutError({
                title: "Confira a entrega",
                description: !userContext.address?.uuid
                    ? "Cadastre um endereço completo antes de finalizar a compra."
                    : "Volte ao carrinho, calcule o frete e escolha uma opção de entrega.",
            });
            return;
        }

        setIsPreparing(true);

        try {
            let currentOrder = order;

            if (!currentOrder) {
                currentOrder = await cart.checkout(
                    userContext.address.uuid,
                    notes.trim() || undefined,
                );
                storeOrder(currentOrder);
                setOrder(currentOrder);
            }

            const shipping = await confirmOrderShipping(
                token,
                currentOrder.uuid,
                serviceCode,
            );
            const confirmedOrder: Order = {
                ...currentOrder,
                ...shipping.order,
                ...(shipping.orderTotals ?? {}),
                shipment: shipping.shipment
                    ? {
                          status: shipping.shipment.status,
                          trackingCode: null,
                          labelUrl: null,
                      }
                    : currentOrder.shipment,
            };

            storeOrder(confirmedOrder);
            setOrder(confirmedOrder);
            setIsShippingConfirmed(true);
        } catch (error) {
            showError(
                error,
                "Não foi possível criar o pedido e confirmar o frete.",
            );
        } finally {
            setIsPreparing(false);
        }
    }

    async function openPayment() {
        if (!token || !order) return;

        setIsRedirecting(true);

        try {
            let currentOrder = order;
            let key =
                currentOrder.paymentIdempotencyKey ??
                window.sessionStorage.getItem(
                    idempotencyStorageKey(currentOrder.uuid),
                );

            if (!key) {
                currentOrder =
                    (await refreshOrder(currentOrder.uuid)) ?? currentOrder;
                key = currentOrder.paymentIdempotencyKey ?? null;
            }

            if (!key) {
                throw new Error(
                    "O pedido não retornou a chave segura de pagamento. Atualize e tente novamente.",
                );
            }

            const payment = await createOrderPayment(
                token,
                currentOrder.uuid,
                key,
            );
            storeOrder(currentOrder);
            window.location.assign(payment.checkoutUrl);
        } catch (error) {
            try {
                const currentOrder = await refreshOrder(order.uuid);
                if (currentOrder?.payment?.checkoutUrl) {
                    window.location.assign(currentOrder.payment.checkoutUrl);
                    return;
                }
            } catch {
                // O modal abaixo mantém o pedido e orienta uma nova tentativa.
            }

            showError(error, "Não foi possível abrir o pagamento.");
            setIsRedirecting(false);
        }
    }

    async function handleManualRefresh() {
        if (!order) return;
        setIsRefreshing(true);
        setPollingTimedOut(false);

        try {
            await refreshOrder(order.uuid);
        } catch (error) {
            showError(error, "Não foi possível atualizar o pagamento.");
        } finally {
            setIsRefreshing(false);
        }
    }

    const displayItems = useMemo(
        () =>
            order?.items?.length
                ? order.items.map((item) => ({
                      uuid: item.uuid,
                      name: item.productNameSnapshot,
                      grams: item.grams,
                      quantity: item.quantity,
                      imageUrl: item.imageUrlSnapshot,
                      totalPriceInCents: item.totalPriceInCents,
                  }))
                : (cart.data?.items ?? []),
        [cart.data?.items, order?.items],
    );
    const cartPromotionDiscount =
        cart.data?.summary.promotionDiscountInCents ?? 0;
    const cartCouponDiscount = cart.data?.summary.couponDiscountInCents ?? 0;
    const discount =
        order?.discountInCents ?? cartPromotionDiscount + cartCouponDiscount;
    const subtotal =
        order?.subtotalInCents ??
        (cart.data?.summary.subtotalInCents ?? 0) + cartPromotionDiscount;
    const shipping = order
        ? order.shippingInCents
        : hasValidServiceCode
          ? estimatedShipping
          : 0;
    const total = order?.totalInCents ?? subtotal + shipping;
    const currentStep =
        paymentConfirmed || paymentProblem || awaitingPayment
            ? 3
            : isShippingConfirmed
              ? 2
              : 1;

    if (isRestoring || (userContext.isLoading && !userContext.user)) {
        return (
            <main className="min-h-[70vh] bg-[#f6f6f8] px-6 py-12 md:px-10">
                <div className="mx-auto max-w-6xl space-y-5">
                    <Skeleton className="h-12 w-72" />
                    <Skeleton className="h-24 w-full rounded-xl bg-white" />
                    <Skeleton className="h-80 w-full rounded-xl bg-white" />
                </div>
            </main>
        );
    }

    return (
        <main className="min-h-screen bg-[#f6f6f8] px-5 py-10 text-[#1f2937] md:px-10 md:py-14">
            <div className="mx-auto max-w-6xl">
                <header className="max-w-3xl">
                    <p className="font-public text-xs font-bold uppercase tracking-[0.18em] text-primary">
                        Compra segura
                    </p>
                    <h1 className="mt-3 font-display text-4xl font-bold leading-tight text-slate-950 md:text-5xl">
                        Tudo certo antes de pagar.
                    </h1>
                    <p className="mt-4 max-w-2xl text-base leading-7 text-slate-600">
                        Confira a entrega e o valor final. O pagamento acontece
                        no ambiente seguro da AbacatePay.
                    </p>
                </header>

                <ol className="mt-8 grid overflow-hidden rounded-xl border border-slate-200 bg-white sm:grid-cols-3">
                    {[
                        ["local_shipping", "Entrega"],
                        ["receipt_long", "Conferência"],
                        ["verified_user", "Pagamento"],
                    ].map(([icon, label], index) => {
                        const step = index + 1;
                        const active = step <= currentStep;

                        return (
                            <li
                                className={`flex min-h-20 items-center gap-3 px-5 py-4 ${index ? "border-t border-slate-200 sm:border-l sm:border-t-0" : ""}`}
                                key={label}
                            >
                                <span
                                    className={`material-symbols-outlined flex size-10 items-center justify-center rounded-full ${active ? "bg-primary text-white" : "bg-slate-100 text-slate-400"}`}
                                >
                                    {icon}
                                </span>
                                <span>
                                    <span className="block font-public text-[0.68rem] font-bold uppercase tracking-[0.14em] text-slate-500">
                                        Etapa {step}
                                    </span>
                                    <span className="mt-0.5 block font-bold text-slate-900">
                                        {label}
                                    </span>
                                </span>
                            </li>
                        );
                    })}
                </ol>

                {!displayItems.length && !order ? (
                    <section className="mt-8 rounded-xl border border-dashed border-slate-300 bg-white px-6 py-12 text-center">
                        <h2 className="font-display text-2xl font-bold text-slate-950">
                            Não há uma compra para finalizar
                        </h2>
                        <p className="mt-2 text-sm text-slate-600">
                            Escolha os produtos e a entrega no carrinho
                            primeiro.
                        </p>
                        <Link
                            className="mt-6 inline-flex rounded-lg bg-primary px-5 py-3 font-bold text-white focus:outline-none focus:ring-4 focus:ring-primary/30"
                            href="/carrinho"
                        >
                            Voltar ao carrinho
                        </Link>
                    </section>
                ) : paymentConfirmed || paymentProblem || awaitingPayment ? (
                    <section className="mt-8 grid gap-6 lg:grid-cols-[1fr_22rem]">
                        <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm md:p-8">
                            <span
                                className={`material-symbols-outlined flex size-14 items-center justify-center rounded-full ${paymentConfirmed ? "bg-emerald-50 text-[#167a45]" : paymentProblem ? "bg-red-50 text-red-700" : "bg-blue-50 text-primary"}`}
                            >
                                {paymentConfirmed
                                    ? "check_circle"
                                    : paymentProblem
                                      ? "error"
                                      : "hourglass_top"}
                            </span>
                            <h2 className="mt-5 font-display text-3xl font-bold text-slate-950">
                                {getPaymentMessage(order!)}
                            </h2>
                            <p className="mt-3 max-w-xl leading-7 text-slate-600">
                                {paymentConfirmed
                                    ? getDeliveryMessage(order!)
                                    : paymentProblem
                                      ? "Seu pedido continua salvo. O atendimento pode orientar os próximos passos."
                                      : pollingTimedOut
                                        ? "O pagamento ainda está em processamento. Você pode atualizar sem criar outro pedido."
                                        : "Estamos consultando a confirmação enviada pelo meio de pagamento. Esta tela se atualiza automaticamente."}
                            </p>
                            {!paymentConfirmed && !paymentProblem ? (
                                <div className="mt-7 flex flex-col gap-3 sm:flex-row">
                                    <button
                                        className="min-h-12 rounded-lg bg-primary px-5 py-3 font-bold text-white focus:outline-none focus:ring-4 focus:ring-primary/30 disabled:opacity-60"
                                        disabled={isRefreshing}
                                        onClick={() =>
                                            void handleManualRefresh()
                                        }
                                        type="button"
                                    >
                                        {isRefreshing
                                            ? "Atualizando..."
                                            : "Atualizar pagamento"}
                                    </button>
                                    {order?.payment?.checkoutUrl ? (
                                        <a
                                            className="min-h-12 rounded-lg border border-slate-300 bg-white px-5 py-3 text-center font-bold text-slate-800 focus:outline-none focus:ring-4 focus:ring-primary/20"
                                            href={order.payment.checkoutUrl}
                                        >
                                            Voltar ao pagamento
                                        </a>
                                    ) : null}
                                </div>
                            ) : null}
                        </div>
                        <OrderReceipt order={order!} />
                    </section>
                ) : (
                    <div className="mt-8 grid gap-8 lg:grid-cols-[1fr_22rem]">
                        <div className="space-y-6">
                            <section className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
                                <div className="flex items-start gap-4">
                                    <span className="material-symbols-outlined text-[#d1a054]">
                                        home_pin
                                    </span>
                                    <div>
                                        <h2 className="font-display text-xl font-bold text-slate-950">
                                            Entrega em
                                        </h2>
                                        {userContext.address ? (
                                            <address className="mt-2 not-italic text-sm leading-6 text-slate-600">
                                                {userContext.address.street},{" "}
                                                {userContext.address.number}
                                                <br />
                                                {
                                                    userContext.address
                                                        .neighborhood
                                                }{" "}
                                                · {userContext.address.city} —{" "}
                                                {userContext.address.state}
                                                <br />
                                                CEP{" "}
                                                {userContext.address.zipCode}
                                            </address>
                                        ) : (
                                            <p className="mt-2 text-sm text-slate-600">
                                                Cadastre um endereço para
                                                continuar.
                                            </p>
                                        )}
                                    </div>
                                </div>
                                {!userContext.address ? (
                                    <Link
                                        className="mt-5 inline-flex rounded-lg border border-primary px-4 py-2 text-sm font-bold text-primary"
                                        href="/perfil"
                                    >
                                        Cadastrar endereço
                                    </Link>
                                ) : null}
                            </section>

                            <section className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
                                <h2 className="font-display text-xl font-bold text-slate-950">
                                    Produtos do pedido
                                </h2>
                                <div className="mt-5 divide-y divide-slate-100">
                                    {displayItems.map((item) => (
                                        <article
                                            className="flex gap-4 py-4 first:pt-0 last:pb-0"
                                            key={item.uuid}
                                        >
                                            <ProductImage
                                                alt={item.name}
                                                className="size-20 shrink-0 rounded-lg object-cover"
                                                src={item.imageUrl}
                                            />
                                            <div className="min-w-0 flex-1">
                                                <h3 className="font-bold text-slate-950">
                                                    {item.name}
                                                </h3>
                                                <p className="mt-1 text-sm text-slate-500">
                                                    {formatProductSizeLabel(
                                                        item.grams,
                                                    )}{" "}
                                                    · {item.quantity} un.
                                                </p>
                                            </div>
                                            <p className="font-bold text-slate-950">
                                                {formatCurrency(
                                                    item.totalPriceInCents,
                                                )}
                                            </p>
                                        </article>
                                    ))}
                                </div>
                            </section>

                            {!order ? (
                                <section className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
                                    <label
                                        className="font-bold text-slate-900"
                                        htmlFor="checkout-notes"
                                    >
                                        Observações para o pedido{" "}
                                        <span className="font-normal text-slate-500">
                                            (opcional)
                                        </span>
                                    </label>
                                    <textarea
                                        className="mt-3 min-h-24 w-full resize-y rounded-lg border border-slate-300 bg-white px-4 py-3 text-sm outline-none focus:border-primary focus:ring-4 focus:ring-primary/15"
                                        id="checkout-notes"
                                        maxLength={500}
                                        onChange={(event) =>
                                            setNotes(event.currentTarget.value)
                                        }
                                        placeholder="Ex.: entregar em horário comercial"
                                        value={notes}
                                    />
                                </section>
                            ) : null}
                        </div>

                        <aside className="h-fit overflow-hidden rounded-xl border border-primary/15 bg-white shadow-lg lg:sticky lg:top-24">
                            <div className="border-b border-slate-100 px-6 py-5">
                                <p className="font-public text-xs font-bold uppercase tracking-[0.16em] text-primary">
                                    Comprovante do ateliê
                                </p>
                                <h2 className="mt-2 font-display text-2xl font-bold text-slate-950">
                                    Resumo final
                                </h2>
                            </div>
                            <div className="space-y-4 px-6 py-5 text-sm">
                                <div className="flex justify-between gap-4">
                                    <span className="text-slate-500">
                                        Produtos
                                    </span>
                                    <span className="font-semibold">
                                        {formatCurrency(subtotal)}
                                    </span>
                                </div>
                                {discount > 0 ? (
                                    <div className="flex justify-between gap-4">
                                        <span className="text-slate-500">
                                            Descontos
                                        </span>
                                        <span className="font-semibold text-[#167a45]">
                                            {formatCurrency(-discount)}
                                        </span>
                                    </div>
                                ) : null}
                                <div className="flex justify-between gap-4">
                                    <span className="text-slate-500">
                                        {serviceName}
                                    </span>
                                    <span className="text-right font-semibold">
                                        {shipping > 0
                                            ? formatCurrency(shipping)
                                            : "A confirmar"}
                                    </span>
                                </div>
                                <div className="border-t border-dashed border-slate-300 pt-4">
                                    <div className="flex items-end justify-between gap-4">
                                        <span className="font-display text-lg font-bold text-slate-950">
                                            Total
                                        </span>
                                        <span className="text-2xl font-black text-primary">
                                            {formatCurrency(total)}
                                        </span>
                                    </div>
                                    {!isShippingConfirmed ? (
                                        <p className="mt-2 text-xs leading-5 text-slate-500">
                                            Confirmamos o frete antes de abrir o
                                            pagamento. Se o valor mudar, você
                                            verá aqui primeiro.
                                        </p>
                                    ) : (
                                        <p className="mt-2 text-xs font-bold leading-5 text-[#167a45]">
                                            Frete e total confirmados pelo
                                            ateliê.
                                        </p>
                                    )}
                                </div>
                            </div>
                            <div className="bg-[#f8f5ef] p-5">
                                {isShippingConfirmed ? (
                                    <button
                                        className="flex min-h-14 w-full items-center justify-center gap-2 rounded-lg bg-primary px-5 py-4 font-bold text-white shadow-md shadow-primary/20 focus:outline-none focus:ring-4 focus:ring-primary/30 disabled:opacity-60"
                                        disabled={isRedirecting}
                                        onClick={() => void openPayment()}
                                        type="button"
                                    >
                                        {isRedirecting
                                            ? "Abrindo pagamento..."
                                            : "Ir para pagamento seguro"}
                                        <span className="material-symbols-outlined text-xl">
                                            lock
                                        </span>
                                    </button>
                                ) : (
                                    <button
                                        className="flex min-h-14 w-full items-center justify-center gap-2 rounded-lg bg-primary px-5 py-4 font-bold text-white shadow-md shadow-primary/20 focus:outline-none focus:ring-4 focus:ring-primary/30 disabled:opacity-60"
                                        disabled={
                                            isPreparing ||
                                            !userContext.address ||
                                            !hasValidServiceCode
                                        }
                                        onClick={() => void prepareOrder()}
                                        type="button"
                                    >
                                        {isPreparing
                                            ? "Confirmando pedido..."
                                            : "Confirmar pedido e frete"}
                                        <span className="material-symbols-outlined text-xl">
                                            arrow_forward
                                        </span>
                                    </button>
                                )}
                                <p className="mt-3 text-center text-xs leading-5 text-slate-500">
                                    Não cobramos nada sem mostrar o valor final.
                                </p>
                            </div>
                        </aside>
                    </div>
                )}
            </div>

            <Dialog
                open={checkoutError != null}
                onOpenChange={(open) => !open && setCheckoutError(null)}
            >
                <DialogContent className="max-w-md rounded-xl bg-white p-6">
                    <DialogHeader>
                        <DialogTitle className="font-display text-2xl font-bold text-slate-950">
                            {checkoutError?.title}
                        </DialogTitle>
                        <DialogDescription className="text-sm leading-6 text-slate-600">
                            {checkoutError?.description}
                        </DialogDescription>
                    </DialogHeader>
                    <div className="mt-6 flex justify-end">
                        <button
                            className="rounded-lg bg-primary px-4 py-2 font-bold text-white"
                            onClick={() => setCheckoutError(null)}
                            type="button"
                        >
                            Entendi
                        </button>
                    </div>
                </DialogContent>
            </Dialog>
        </main>
    );
}

function OrderReceipt({ order }: { order: Order }) {
    return (
        <aside className="h-fit rounded-xl border border-primary/15 bg-white p-6 shadow-sm">
            <p className="font-public text-xs font-bold uppercase tracking-[0.16em] text-primary">
                Pedido registrado
            </p>
            <p className="mt-2 break-all font-mono text-xs text-slate-500">
                {order.uuid}
            </p>
            <dl className="mt-5 space-y-3 border-t border-dashed border-slate-300 pt-5 text-sm">
                <div className="flex justify-between gap-3">
                    <dt className="text-slate-500">Produtos</dt>
                    <dd className="font-semibold">
                        {formatCurrency(order.subtotalInCents)}
                    </dd>
                </div>
                <div className="flex justify-between gap-3">
                    <dt className="text-slate-500">Frete</dt>
                    <dd className="font-semibold">
                        {formatCurrency(order.shippingInCents)}
                    </dd>
                </div>
                {order.discountInCents > 0 ? (
                    <div className="flex justify-between gap-3">
                        <dt className="text-slate-500">Descontos</dt>
                        <dd className="font-semibold text-[#167a45]">
                            {formatCurrency(-order.discountInCents)}
                        </dd>
                    </div>
                ) : null}
                <div className="flex justify-between gap-3 border-t border-slate-100 pt-3">
                    <dt className="font-display text-lg font-bold">Total</dt>
                    <dd className="text-xl font-black text-primary">
                        {formatCurrency(order.totalInCents)}
                    </dd>
                </div>
            </dl>
            <Link
                className="mt-6 inline-flex text-sm font-bold text-primary underline-offset-4 hover:underline"
                href="/perfil"
            >
                Ver meus pedidos
            </Link>
        </aside>
    );
}
