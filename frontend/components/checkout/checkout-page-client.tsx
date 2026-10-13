"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useCallback, useEffect, useMemo, useState } from "react";
import {
    CheckoutError,
    CheckoutErrorDialog,
    CheckoutLoading,
    EmptyCheckout,
} from "./checkout-feedback";
import {
    CheckoutCustomerDocument,
    CheckoutReviewDetails,
    DeliveryAddress,
    OrderItems,
    OrderNotes,
} from "./checkout-details";
import { CheckoutSteps } from "./checkout-steps";
import { CheckoutSummary } from "./checkout-summary";
import { CheckoutShippingOptions } from "./checkout-shipping-options";
import {
    idempotencyStorageKey,
    PAYMENT_CONFIRMED_STATUSES,
    PAYMENT_PROBLEM_STATUSES,
    readStoredOrderUuid,
    storeOrder,
} from "./checkout-utils";
import { PaymentStatus } from "./payment-status";
import { CheckoutAddressForm } from "./checkout-address-form";
import { CheckoutCustomerFieldForm } from "./checkout-customer-field-form";
import { isValidCpf } from "@/components/profile/profile-page-helpers";
import { useApiToken } from "@/hooks/use-api-token";
import { useCart } from "@/hooks/use-cart";
import { useUser } from "@/hooks/use-user";
import {
    ApiError,
    createOrderPayment,
    getOrder,
    previewShippingQuote,
} from "@/lib/api";
import {
    getShippingContextKey,
    sortShippingServices,
    toShippingOption,
    type ShippingOption,
} from "@/lib/shipping";
import type { Cart, Order, ShippingQuoteService } from "@/lib/types";
import { formatCurrency } from "@/lib/utils";

type CheckoutPageClientProps = {
    initialCart: Cart | null;
};

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
    const [quotedShipping, setQuotedShipping] = useState<ShippingOption | null>(
        null,
    );
    const [quotedServices, setQuotedServices] = useState<
        ShippingQuoteService[]
    >([]);
    const [isShippingQuoteLoading, setIsShippingQuoteLoading] = useState(false);
    const [hasVerifiedShippingQuote, setHasVerifiedShippingQuote] =
        useState(false);
    const [pollingTimedOut, setPollingTimedOut] = useState(false);
    const [checkoutError, setCheckoutError] = useState<CheckoutError | null>(
        null,
    );
    const [isEditingAddress, setIsEditingAddress] = useState(false);
    const [isEditingDocument, setIsEditingDocument] = useState(false);
    const [isReviewing, setIsReviewing] = useState(false);

    const hasValidServiceCode =
        Number.isInteger(quotedShipping?.serviceCode) &&
        (quotedShipping?.serviceCode ?? 0) > 0;
    const document = userContext.user?.document ?? "";
    const documentLength = document.replace(/\D/g, "").length;
    const hasValidDocument =
        documentLength === 14 ||
        (documentLength === 11 && isValidCpf(document));
    const requiresPhone = quotedShipping?.serviceCode === 33;
    const hasValidPhone =
        !requiresPhone ||
        userContext.user?.phone?.replace(/\D/g, "").length === 11;
    const hasValidAddress = Boolean(
        userContext.address?.uuid &&
        userContext.address.zipCode.replace(/\D/g, "").length === 8 &&
        userContext.address.street.trim().length > 0 &&
        userContext.address.street.length <= 30,
    );
    const canReview =
        hasValidDocument &&
        hasValidAddress &&
        hasValidPhone &&
        hasVerifiedShippingQuote;
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

    const quoteItems = useMemo(
        () =>
            (cart.data?.items ?? []).map((item) => ({
                productUuid: item.productUuid,
                productSize: item.productSize,
                quantity: item.quantity,
            })),
        [cart.data?.items],
    );
    const shippingZipCode =
        userContext.address?.zipCode.replace(/\D/g, "") ?? "";
    const shippingContextKey = getShippingContextKey(
        cart.data,
        shippingZipCode,
    );
    const requestedServiceCode = Number(searchParams.get("serviceCode"));
    const requestedQuoteContext = searchParams.get("quoteContext");

    useEffect(() => {
        if (order) return;

        if (shippingZipCode.length !== 8 || !quoteItems.length) {
            setQuotedServices([]);
            setQuotedShipping(null);
            setHasVerifiedShippingQuote(false);
            return;
        }

        let cancelled = false;
        setIsShippingQuoteLoading(true);
        setHasVerifiedShippingQuote(false);
        setQuotedServices([]);
        setQuotedShipping(null);

        void previewShippingQuote(shippingZipCode, quoteItems)
            .then((quote) => {
                if (cancelled) return;

                const services = sortShippingServices(quote.quotedServices);
                const canRestoreCartSelection =
                    requestedQuoteContext != null &&
                    requestedQuoteContext === shippingContextKey;
                const selectedService =
                    (canRestoreCartSelection
                        ? services.find(
                              (service) =>
                                  service.serviceCode === requestedServiceCode,
                          )
                        : undefined) ?? services[0];

                if (!selectedService) {
                    setQuotedServices([]);
                    setQuotedShipping(null);
                    setCheckoutError({
                        title: "Não há frete disponível",
                        description:
                            "Nenhuma transportadora atende este endereço para os produtos do carrinho. Confira o endereço e tente novamente.",
                    });
                    return;
                }

                setQuotedServices(services);
                setQuotedShipping(toShippingOption(selectedService));
                setHasVerifiedShippingQuote(true);
            })
            .catch(() => {
                if (cancelled) return;

                setCheckoutError({
                    title: "Não foi possível confirmar o frete",
                    description:
                        "Aguarde um pouco, verifique sua conexão com a internet e atualize a página para tentar novamente.",
                });
            })
            .finally(() => {
                if (!cancelled) setIsShippingQuoteLoading(false);
            });

        return () => {
            cancelled = true;
        };
    }, [
        order,
        quoteItems,
        requestedQuoteContext,
        requestedServiceCode,
        shippingContextKey,
        shippingZipCode,
    ]);

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
        if (
            !token ||
            !hasValidDocument ||
            !hasValidAddress ||
            !hasValidPhone ||
            !userContext.address?.uuid ||
            !quotedShipping ||
            !hasValidServiceCode ||
            !hasVerifiedShippingQuote
        ) {
            setCheckoutError({
                title: "Complete os dados do pedido",
                description: !hasValidDocument
                    ? "Cadastre seu CPF antes de finalizar a compra."
                    : !hasValidAddress
                      ? "Cadastre um endereço com a rua limitada a 30 caracteres."
                      : !hasValidPhone
                        ? "Esta transportadora exige um telefone com DDD e 11 números."
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
                    {
                        serviceCode: quotedShipping.serviceCode,
                        priceInCents: quotedShipping.priceInCents,
                    },
                    notes.trim() || undefined,
                );
                storeOrder(currentOrder);
                setOrder(currentOrder);
            }
            setIsShippingConfirmed(true);
        } catch (error) {
            if (error instanceof ApiError && error.status === 409) {
                const quoteItems = (cart.data?.items ?? []).map((item) => ({
                    productUuid: item.productUuid,
                    productSize: item.productSize,
                    quantity: item.quantity,
                }));

                try {
                    const quote = await previewShippingQuote(
                        userContext.address.zipCode.replace(/\D/g, ""),
                        quoteItems,
                    );
                    const services = sortShippingServices(quote.quotedServices);
                    const updatedService = services.find(
                        (service) =>
                            service.serviceCode === quotedShipping.serviceCode,
                    );
                    setQuotedServices(services);

                    if (
                        updatedService &&
                        updatedService.priceInCents !==
                            quotedShipping.priceInCents
                    ) {
                        const previousPrice = quotedShipping.priceInCents;
                        setQuotedShipping(toShippingOption(updatedService));
                        setHasVerifiedShippingQuote(true);
                        setCheckoutError({
                            title: "Frete atualizado",
                            description: `${updatedService.serviceName} passou de ${formatCurrency(previousPrice)} para ${formatCurrency(updatedService.priceInCents)}. Confira o novo total e confirme o pedido novamente.`,
                        });
                        return;
                    }

                    if (updatedService) {
                        setCheckoutError({
                            title: "Não foi possível confirmar o frete",
                            description:
                                "A transportadora recusou a confirmação, mas a nova cotação manteve o mesmo valor. Tente confirmar o pedido novamente.",
                        });
                        return;
                    }

                    if (services[0]) {
                        setQuotedShipping(toShippingOption(services[0]));
                        setHasVerifiedShippingQuote(true);
                        setIsReviewing(false);
                        setCheckoutError({
                            title: "Opção de frete atualizada",
                            description: `${quotedShipping.name} não está mais disponível. Selecionamos ${services[0].serviceName}, a opção mais barata disponível. Confira prazo e total antes de continuar.`,
                        });
                        return;
                    }
                } catch {
                    // O modal abaixo orienta nova cotação sem esconder o conflito.
                }

                setQuotedShipping(null);
                setQuotedServices([]);
                setHasVerifiedShippingQuote(false);
                setCheckoutError({
                    title: "Frete atualizado",
                    description:
                        "A opção escolhida não está mais disponível. Confira o endereço e tente novamente.",
                });
                return;
            }

            showError(error, "Não foi possível criar o pedido.");
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
        order?.subtotalInCents ?? cart.data?.summary.subtotalInCents ?? 0;
    const shipping = order
        ? order.shippingInCents
        : hasVerifiedShippingQuote && quotedShipping
          ? quotedShipping.priceInCents
          : 0;
    const total =
        order?.totalInCents ??
        (cart.data?.summary.totalInCents ?? subtotal - discount) + shipping;
    const currentStep =
        paymentConfirmed || paymentProblem || awaitingPayment
            ? 3
            : isReviewing || isShippingConfirmed
              ? 2
              : 1;

    if (isRestoring || (userContext.isLoading && !userContext.user)) {
        return <CheckoutLoading />;
    }

    return (
        <main className="min-h-screen bg-[#f6f6f8] px-4 py-8 text-[#1f2937] sm:px-6 md:px-10 md:py-12">
            <div className="mx-auto max-w-6xl">
                <header className="max-w-3xl">
                    <Link
                        className="inline-flex min-h-11 items-center gap-2 rounded-lg text-sm font-bold text-primary hover:underline"
                        href="/carrinho"
                    >
                        <span
                            aria-hidden="true"
                            className="material-symbols-outlined text-lg"
                        >
                            arrow_back
                        </span>
                        Voltar ao carrinho
                    </Link>
                    <h1 className="mt-3 text-balance font-display text-3xl font-bold leading-tight text-slate-950 sm:text-4xl md:text-5xl">
                        Tudo certo antes de pagar.
                    </h1>
                    <p className="mt-4 max-w-2xl text-base leading-7 text-slate-600">
                        Confira a entrega e o valor final. O pagamento acontece
                        no ambiente seguro da AbacatePay.
                    </p>
                </header>

                <CheckoutSteps currentStep={currentStep} />

                {!displayItems.length && !order ? (
                    <EmptyCheckout />
                ) : paymentConfirmed || paymentProblem || awaitingPayment ? (
                    <PaymentStatus
                        isRedirecting={isRedirecting}
                        isRefreshing={isRefreshing}
                        onOpenPayment={() => void openPayment()}
                        onRefresh={() => void handleManualRefresh()}
                        order={order!}
                        paymentConfirmed={paymentConfirmed}
                        paymentProblem={paymentProblem}
                        pollingTimedOut={pollingTimedOut}
                    />
                ) : (
                    <div className="mt-8 grid items-start gap-8 lg:grid-cols-[minmax(0,1fr)_22rem]">
                        <div className="space-y-6">
                            {isReviewing ? (
                                <CheckoutReviewDetails
                                    document={userContext.user?.document ?? ""}
                                    notes={notes}
                                    onEdit={() => setIsReviewing(false)}
                                    phone={userContext.user?.phone}
                                />
                            ) : null}
                            {hasValidAddress && !isEditingAddress ? (
                                <DeliveryAddress
                                    address={userContext.address!}
                                    onEdit={() => {
                                        setIsReviewing(false);
                                        setIsEditingAddress(true);
                                    }}
                                />
                            ) : (
                                <CheckoutAddressForm
                                    address={userContext.address}
                                    onCancel={
                                        hasValidAddress
                                            ? () => setIsEditingAddress(false)
                                            : undefined
                                    }
                                    onError={(title, description) =>
                                        setCheckoutError({
                                            title,
                                            description,
                                        })
                                    }
                                    onSaved={() => {
                                        setIsEditingAddress(false);
                                        setCheckoutError({
                                            title: "Endereço atualizado",
                                            description:
                                                "O endereço de entrega foi salvo. Confira os dados antes de confirmar o pedido.",
                                        });
                                    }}
                                />
                            )}

                            {hasValidAddress && !isEditingAddress ? (
                                <CheckoutShippingOptions
                                    isLoading={isShippingQuoteLoading}
                                    onSelect={(service) => {
                                        setQuotedShipping(
                                            toShippingOption(service),
                                        );
                                        setHasVerifiedShippingQuote(true);
                                        setIsReviewing(false);
                                    }}
                                    selected={quotedShipping}
                                    services={quotedServices}
                                />
                            ) : null}

                            {!isReviewing ? (
                                hasValidDocument && !isEditingDocument ? (
                                    <CheckoutCustomerDocument
                                        document={document}
                                        onEdit={() =>
                                            setIsEditingDocument(true)
                                        }
                                    />
                                ) : (
                                    <CheckoutCustomerFieldForm
                                        field="document"
                                        initialValue={document}
                                        onCancel={
                                            hasValidDocument
                                                ? () =>
                                                      setIsEditingDocument(
                                                          false,
                                                      )
                                                : undefined
                                        }
                                        onError={(title, description) =>
                                            setCheckoutError({
                                                title,
                                                description,
                                            })
                                        }
                                        onSaved={(title, description) => {
                                            setIsEditingDocument(false);
                                            setCheckoutError({
                                                title,
                                                description,
                                            });
                                        }}
                                    />
                                )
                            ) : null}

                            {!isReviewing && !hasValidPhone ? (
                                <CheckoutCustomerFieldForm
                                    field="phone"
                                    onError={(title, description) =>
                                        setCheckoutError({
                                            title,
                                            description,
                                        })
                                    }
                                    onSaved={(title, description) =>
                                        setCheckoutError({
                                            title,
                                            description,
                                        })
                                    }
                                />
                            ) : null}
                            <OrderItems items={displayItems} />

                            {!order && !isReviewing ? (
                                <OrderNotes notes={notes} onChange={setNotes} />
                            ) : null}
                        </div>

                        <CheckoutSummary
                            canPrepare={canReview}
                            discount={discount}
                            hasVerifiedShippingQuote={hasVerifiedShippingQuote}
                            isPreparing={isPreparing}
                            isRedirecting={isRedirecting}
                            isReviewing={isReviewing}
                            isShippingQuoteLoading={isShippingQuoteLoading}
                            isShippingConfirmed={isShippingConfirmed}
                            onOpenPayment={() => void openPayment()}
                            onPrepareOrder={() => void prepareOrder()}
                            onReview={() => setIsReviewing(true)}
                            serviceName={quotedShipping?.name ?? "Frete"}
                            shipping={shipping}
                            subtotal={subtotal}
                            total={total}
                        />
                    </div>
                )}
            </div>

            <CheckoutErrorDialog
                error={checkoutError}
                onClose={() => setCheckoutError(null)}
            />
        </main>
    );
}
