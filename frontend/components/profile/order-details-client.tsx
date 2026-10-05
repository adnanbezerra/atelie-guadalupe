"use client";

import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useState } from "react";
import { FeedbackDialog } from "@/components/shared/feedback-dialog";
import {
    formatAddress,
    formatPaymentMethod,
    orderStatusClasses,
    orderStatusLabels,
    type ProfileOrder,
} from "@/components/profile/profile-page-helpers";
import { useApiToken } from "@/hooks/use-api-token";
import { getOrder } from "@/lib/api";
import { formatCurrency } from "@/lib/format";
import type { Order } from "@/lib/types";
import { formatProductSizeLabel } from "@/lib/utils";
import { buildWhatsappLink } from "@/lib/whatsapp";

type OrderDetailsClientProps = {
    orderUuid: string;
};

const ORDER_STEPS = [
    { key: "received", icon: "receipt_long", label: "Pedido recebido" },
    { key: "paid", icon: "check_circle", label: "Pagamento confirmado" },
    { key: "preparing", icon: "inventory_2", label: "Em preparação" },
    { key: "shipped", icon: "local_shipping", label: "A caminho" },
    { key: "delivered", icon: "home", label: "Entregue" },
] as const;

const statusStep: Record<string, number> = {
    PENDING: 0,
    AWAITING_PAYMENT: 0,
    PAID: 1,
    PROCESSING: 2,
    SHIPPED: 3,
    DELIVERED: 4,
};

const paymentStatusLabels: Record<string, string> = {
    CREATING: "Preparando pagamento",
    PENDING: "Aguardando pagamento",
    PAID: "Pagamento confirmado",
    REFUND_PENDING: "Reembolso em andamento",
    REFUNDED: "Pagamento reembolsado",
    DISPUTED: "Pagamento em contestação",
    LOST: "Pagamento não concluído",
};

const deliveryStatusLabels: Record<string, string> = {
    DRAFT: "Frete ainda não confirmado",
    QUOTED: "Frete cotado",
    CONFIRMED: "Frete confirmado",
    CHECKOUT_REQUESTED: "Etiqueta sendo emitida",
    LABEL_PURCHASED: "Etiqueta emitida",
    CANCELLED: "Frete cancelado",
};

const fulfillmentStatusLabels: Record<string, string> = {
    PENDING: "Envio aguardando processamento",
    PROCESSING: "Preparando a etiqueta de envio",
    RETRY_SCHEDULED: "Nova tentativa de envio agendada",
    COMPLETED: "Etiqueta de envio emitida",
    FAILED: "Falha ao preparar o envio",
};

const DEFAULT_TRACKING_URL = "https://rastreamento.superfrete.com/";
const supportLink = buildWhatsappLink(
    "Olá! Preciso de ajuda com o status de um pedido do Ateliê Guadalupe.",
);

const paymentProblemStatuses = new Set([
    "REFUND_PENDING",
    "REFUNDED",
    "DISPUTED",
    "LOST",
]);

function getOrderException(order: Order) {
    if (order.status === "CANCELLED") {
        return {
            title: "Pedido cancelado",
            description: "Este pedido não seguirá para preparação ou entrega.",
        };
    }
    if (paymentProblemStatuses.has(order.payment?.status ?? "")) {
        return {
            title:
                paymentStatusLabels[order.payment?.status ?? ""] ??
                "Pagamento precisa de atenção",
            description:
                "O histórico do pedido foi preservado. Fale com o atendimento para entender os próximos passos.",
        };
    }
    if (order.fulfillment?.status === "FAILED") {
        return {
            title: "Pagamento confirmado; envio precisa de atenção",
            description:
                "A preparação da etiqueta falhou. O pagamento continua confirmado e o atendimento pode acompanhar a correção.",
        };
    }
    return null;
}

function isTransientOrder(order: Order) {
    return (
        ["PENDING", "AWAITING_PAYMENT", "PAID", "PROCESSING"].includes(
            order.status,
        ) ||
        ["CREATING", "PENDING"].includes(order.payment?.status ?? "") ||
        ["PENDING", "PROCESSING", "RETRY_SCHEDULED"].includes(
            order.fulfillment?.status ?? "",
        )
    );
}

function formatOrderDate(value: string) {
    return new Intl.DateTimeFormat("pt-BR", {
        day: "2-digit",
        month: "long",
        year: "numeric",
        hour: "2-digit",
        minute: "2-digit",
    }).format(new Date(value));
}

function OrderProgress({ order }: { order: Order }) {
    const exception = getOrderException(order);

    if (exception) {
        return (
            <div className="mt-7 flex items-start gap-3 rounded-xl bg-red-50 p-4 text-red-800">
                <span aria-hidden="true" className="material-symbols-outlined">
                    cancel
                </span>
                <div>
                    <p className="font-bold">{exception.title}</p>
                    <p className="mt-1 text-sm leading-6">
                        {exception.description}
                    </p>
                </div>
            </div>
        );
    }

    const paymentPaid =
        order.payment?.status === "PAID" ||
        ["PAID", "PROCESSING", "SHIPPED", "DELIVERED"].includes(order.status);
    const fulfillmentStarted = Boolean(order.fulfillment);
    const currentStep = paymentPaid
        ? Math.max(statusStep[order.status] ?? 1, fulfillmentStarted ? 2 : 1)
        : 0;

    return (
        <ol className="mt-8 grid gap-0 md:grid-cols-5">
            {ORDER_STEPS.map((step, index) => {
                const isReached = index <= currentStep;
                const isCurrent = index === currentStep;

                return (
                    <li
                        aria-current={isCurrent ? "step" : undefined}
                        className="relative flex min-h-20 gap-4 pl-1 md:block md:min-h-0 md:px-2 md:pl-0 md:text-center"
                        key={step.key}
                    >
                        {index < ORDER_STEPS.length - 1 ? (
                            <span
                                aria-hidden="true"
                                className={`absolute left-[1.35rem] top-10 h-[calc(100%-1.5rem)] w-px md:left-1/2 md:top-5 md:h-px md:w-full ${index < currentStep ? "bg-primary" : "bg-slate-200"}`}
                            />
                        ) : null}
                        <span
                            aria-hidden="true"
                            className={`material-symbols-outlined relative z-10 flex size-10 shrink-0 items-center justify-center rounded-full text-xl md:mx-auto ${isReached ? "bg-primary text-white" : "bg-slate-100 text-slate-400"}`}
                            style={
                                isReached
                                    ? {
                                          fontVariationSettings:
                                              "'FILL' 1, 'wght' 500, 'GRAD' 0, 'opsz' 24",
                                      }
                                    : undefined
                            }
                        >
                            {step.icon}
                        </span>
                        <p
                            className={`pt-2 text-sm font-bold md:mt-3 md:pt-0 ${isReached ? "text-slate-900" : "text-slate-400"}`}
                        >
                            {step.label}
                        </p>
                    </li>
                );
            })}
        </ol>
    );
}

function OrderDetails({
    isRefreshing,
    onRefresh,
    order,
}: {
    isRefreshing: boolean;
    onRefresh: () => void;
    order: Order;
}) {
    const card = order.payment?.card;
    const itemsCount = order.items.reduce(
        (total, item) => total + item.quantity,
        0,
    );
    const paymentMethod = formatPaymentMethod(order as ProfileOrder);
    const paymentDetail = card?.lastFourDigits
        ? `${card.brand ? `${card.brand} ` : ""}final ${card.lastFourDigits}`
        : null;
    const shipment = order.shipment;
    const trackingUrl = shipment?.trackingUrl ?? DEFAULT_TRACKING_URL;
    const exception = getOrderException(order);
    const awaitingPayment =
        !exception &&
        !["PAID", "PROCESSING", "SHIPPED", "DELIVERED"].includes(
            order.status,
        ) &&
        order.payment?.status !== "PAID";
    const overallStatusLabel = exception
        ? exception.title
        : awaitingPayment
          ? (paymentStatusLabels[order.payment?.status ?? ""] ??
            "Aguardando pagamento")
          : order.fulfillment?.status
            ? (fulfillmentStatusLabels[order.fulfillment.status] ??
              orderStatusLabels[order.status] ??
              order.status)
            : (orderStatusLabels[order.status] ?? order.status);
    const overallStatusClassName = exception
        ? "bg-red-50 text-red-800 ring-red-200"
        : (orderStatusClasses[order.status] ??
          "bg-slate-50 text-slate-700 ring-slate-200");

    return (
        <>
            <div
                aria-hidden="true"
                className="hidden"
                dangerouslySetInnerHTML={{
                    __html: "<!-- THESIS: Um comprovante claro que transforma dados do pedido em acompanhamento, sem painel genérico. OWN-WORLD: Capela clara, azul Guadalupe, ouro discreto, superfícies brancas e cantos de 12–16px. STORY: A pessoa reconhece o pedido, entende onde ele está e confere compra, pagamento e entrega. FIRST VIEWPORT: Voltar, identidade do pedido e linha de andamento ocupam o topo; detalhes seguem abaixo. FORM: Comprovante de ateliê, estrutura escolhida diretamente para extensão da área de perfil; sem seed. -->",
                }}
            />
            <section className="rounded-2xl bg-white p-6 shadow-sm md:p-8">
                <div className="flex flex-col gap-5 md:flex-row md:items-start md:justify-between">
                    <div>
                        <p className="text-sm font-bold text-primary">
                            Pedido #{order.uuid.slice(0, 8)}
                        </p>
                        <h1 className="mt-2 font-display text-3xl font-bold tracking-[-0.025em] text-slate-950 md:text-4xl">
                            Detalhes do seu pedido
                        </h1>
                        <p className="mt-3 text-sm leading-6 text-slate-600">
                            Realizado em {formatOrderDate(order.placedAt)}
                        </p>
                    </div>
                    <span
                        className={`w-fit rounded-full px-4 py-2 text-xs font-bold uppercase tracking-[0.08em] ring-1 ${overallStatusClassName}`}
                    >
                        {overallStatusLabel}
                    </span>
                </div>
                <OrderProgress order={order} />
            </section>

            <div className="mt-6 grid items-start gap-6 lg:grid-cols-[minmax(0,1fr)_21rem]">
                <div className="space-y-6">
                    <section className="rounded-2xl bg-white p-6 shadow-sm md:p-8">
                        <div className="flex items-end justify-between gap-4 border-b border-slate-100 pb-5">
                            <div>
                                <h2 className="text-xl font-extrabold text-slate-950">
                                    Itens do pedido
                                </h2>
                                <p className="mt-1 text-sm text-slate-600">
                                    {itemsCount}{" "}
                                    {itemsCount === 1
                                        ? "item comprado"
                                        : "itens comprados"}
                                </p>
                            </div>
                        </div>
                        <div className="divide-y divide-slate-100">
                            {order.items.map((item) => (
                                <article
                                    className="grid grid-cols-[4.5rem_minmax(0,1fr)] gap-4 py-5 sm:grid-cols-[5.5rem_minmax(0,1fr)_auto] sm:items-center"
                                    key={item.uuid}
                                >
                                    <div className="relative aspect-square overflow-hidden rounded-xl bg-[#f8f5ef]">
                                        {item.imageUrlSnapshot ? (
                                            <Image
                                                alt=""
                                                className="object-cover"
                                                fill
                                                sizes="88px"
                                                src={item.imageUrlSnapshot}
                                                unoptimized
                                            />
                                        ) : (
                                            <span
                                                aria-hidden="true"
                                                className="material-symbols-outlined flex size-full items-center justify-center text-3xl text-[#8c6d4f]"
                                            >
                                                spa
                                            </span>
                                        )}
                                    </div>
                                    <div className="min-w-0">
                                        <h3 className="font-bold text-slate-900">
                                            {item.productNameSnapshot}
                                        </h3>
                                        <p className="mt-1 text-sm leading-6 text-slate-600">
                                            {formatProductSizeLabel(item.grams)}{" "}
                                            · {item.quantity}{" "}
                                            {item.quantity === 1
                                                ? "unidade"
                                                : "unidades"}
                                        </p>
                                        <p className="mt-1 text-sm text-slate-500 sm:hidden">
                                            {formatCurrency(
                                                item.unitPriceInCents,
                                            )}{" "}
                                            cada
                                        </p>
                                    </div>
                                    <div className="col-start-2 text-left sm:col-auto sm:text-right">
                                        <p className="font-extrabold text-slate-950">
                                            {formatCurrency(
                                                item.totalPriceInCents,
                                            )}
                                        </p>
                                        <p className="mt-1 hidden text-xs text-slate-500 sm:block">
                                            {formatCurrency(
                                                item.unitPriceInCents,
                                            )}{" "}
                                            cada
                                        </p>
                                    </div>
                                </article>
                            ))}
                        </div>
                    </section>

                    <section className="grid overflow-hidden rounded-2xl bg-white shadow-sm md:grid-cols-2">
                        <div className="p-6 md:border-r md:border-slate-100 md:p-8">
                            <span
                                aria-hidden="true"
                                className="material-symbols-outlined text-2xl text-primary"
                            >
                                payments
                            </span>
                            <h2 className="mt-4 text-lg font-extrabold text-slate-950">
                                Pagamento
                            </h2>
                            <p className="mt-3 font-bold text-slate-800">
                                {paymentMethod}
                            </p>
                            {paymentDetail ? (
                                <p className="mt-1 text-sm text-slate-600">
                                    {paymentDetail}
                                </p>
                            ) : null}
                            <p className="mt-3 text-sm leading-6 text-slate-600">
                                {order.payment?.status
                                    ? (paymentStatusLabels[
                                          order.payment.status
                                      ] ?? order.payment.status)
                                    : awaitingPayment
                                      ? "Aguardando pagamento"
                                      : "Status do pagamento não informado"}
                            </p>
                        </div>
                        <div className="border-t border-slate-100 p-6 md:border-t-0 md:p-8">
                            <span
                                aria-hidden="true"
                                className="material-symbols-outlined text-2xl text-primary"
                            >
                                local_shipping
                            </span>
                            <h2 className="mt-4 text-lg font-extrabold text-slate-950">
                                Entrega
                            </h2>
                            <p className="mt-3 font-bold text-slate-800">
                                {shipment?.selectedServiceName ??
                                    "Método de entrega não informado"}
                            </p>
                            <p className="mt-1 text-sm leading-6 text-slate-600">
                                {shipment?.status
                                    ? (deliveryStatusLabels[shipment.status] ??
                                      shipment.status)
                                    : "Status do frete não informado"}
                            </p>
                            {order.fulfillment?.status ? (
                                <p className="mt-2 text-sm leading-6 text-slate-600">
                                    {fulfillmentStatusLabels[
                                        order.fulfillment.status
                                    ] ?? order.fulfillment.status}
                                </p>
                            ) : null}
                            {shipment?.estimatedDeliveryAt ? (
                                <p className="mt-3 text-sm text-slate-600">
                                    Previsão:{" "}
                                    {formatOrderDate(
                                        shipment.estimatedDeliveryAt,
                                    )}
                                </p>
                            ) : shipment?.deliveryDays ? (
                                <p className="mt-3 text-sm text-slate-600">
                                    Prazo informado: {shipment.deliveryDays}{" "}
                                    dias úteis
                                </p>
                            ) : null}
                        </div>
                    </section>

                    <section className="rounded-2xl bg-white p-6 shadow-sm md:p-8">
                        <h2 className="text-lg font-extrabold text-slate-950">
                            Endereço final de entrega
                        </h2>
                        <p className="mt-3 max-w-[65ch] text-sm font-medium leading-7 text-slate-700">
                            {formatAddress(order)}
                        </p>
                    </section>

                    {order.notes ? (
                        <section className="rounded-2xl bg-[#f8f5ef] p-6 md:p-8">
                            <h2 className="text-lg font-extrabold text-[#4a3728]">
                                Observação do pedido
                            </h2>
                            <p className="mt-3 max-w-[65ch] text-sm leading-7 text-slate-700">
                                {order.notes}
                            </p>
                        </section>
                    ) : null}
                </div>

                <aside className="rounded-2xl bg-white p-6 shadow-sm lg:sticky lg:top-28">
                    <h2 className="text-lg font-extrabold text-slate-950">
                        Resumo
                    </h2>
                    <dl className="mt-5 space-y-3 text-sm">
                        <div className="flex justify-between gap-4 text-slate-600">
                            <dt>Subtotal</dt>
                            <dd>{formatCurrency(order.subtotalInCents)}</dd>
                        </div>
                        <div className="flex justify-between gap-4 text-slate-600">
                            <dt>Entrega</dt>
                            <dd>
                                {order.shippingInCents
                                    ? formatCurrency(order.shippingInCents)
                                    : "Grátis"}
                            </dd>
                        </div>
                        {order.discountInCents > 0 ? (
                            <div className="flex justify-between gap-4 text-emerald-700">
                                <dt>
                                    Descontos
                                    {order.couponCode
                                        ? ` (${order.couponCode})`
                                        : ""}
                                </dt>
                                <dd>
                                    -{formatCurrency(order.discountInCents)}
                                </dd>
                            </div>
                        ) : null}
                        <div className="flex items-baseline justify-between gap-4 border-t border-slate-100 pt-4 text-slate-950">
                            <dt className="font-bold">Total</dt>
                            <dd className="text-xl font-extrabold">
                                {formatCurrency(order.totalInCents)}
                            </dd>
                        </div>
                    </dl>

                    {shipment?.trackingCode ? (
                        <div className="mt-6 border-t border-slate-100 pt-6">
                            <p className="text-sm font-bold text-slate-950">
                                Código de rastreio
                            </p>
                            <p className="mt-2 [overflow-wrap:anywhere] text-sm text-slate-700">
                                {shipment.trackingCode}
                            </p>
                            <a
                                className="mt-4 inline-flex min-h-11 w-full items-center justify-center gap-2 rounded-lg bg-primary px-4 py-3 text-sm font-bold text-white hover:bg-primary/90"
                                href={trackingUrl}
                                rel="noreferrer"
                                target="_blank"
                            >
                                Rastrear encomenda
                                <span
                                    aria-hidden="true"
                                    className="material-symbols-outlined text-lg"
                                >
                                    open_in_new
                                </span>
                            </a>
                        </div>
                    ) : null}
                    <div className="mt-6 space-y-3 border-t border-slate-100 pt-6">
                        {awaitingPayment ? (
                            <Link
                                className="flex min-h-11 w-full items-center justify-center rounded-lg bg-primary px-4 py-3 text-sm font-bold text-white hover:bg-primary/90"
                                href={`/checkout?orderUuid=${encodeURIComponent(order.uuid)}`}
                            >
                                Continuar pagamento
                            </Link>
                        ) : null}
                        <button
                            className="min-h-11 w-full rounded-lg border border-slate-200 bg-white px-4 py-3 text-sm font-bold text-slate-800 hover:bg-slate-50 focus:outline-none focus:ring-4 focus:ring-primary/20 disabled:opacity-60"
                            disabled={isRefreshing}
                            onClick={onRefresh}
                            type="button"
                        >
                            {isRefreshing
                                ? "Atualizando pedido..."
                                : "Atualizar status"}
                        </button>
                        {exception ? (
                            <a
                                className="flex min-h-11 w-full items-center justify-center rounded-lg px-4 py-3 text-center text-sm font-bold text-primary hover:bg-primary/5"
                                href={supportLink}
                                rel="noreferrer"
                                target="_blank"
                            >
                                Falar com o atendimento
                            </a>
                        ) : null}
                    </div>
                </aside>
            </div>
        </>
    );
}

export function OrderDetailsClient({ orderUuid }: OrderDetailsClientProps) {
    const router = useRouter();
    const token = useApiToken();
    const [order, setOrder] = useState<Order | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [isRefreshing, setIsRefreshing] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [notice, setNotice] = useState<string | null>(null);

    const loadOrder = useCallback(
        async (signal?: AbortSignal) => {
            if (!token) return null;
            const result = await getOrder(token, orderUuid, signal);
            setOrder(result.order);
            return result.order;
        },
        [orderUuid, token],
    );

    useEffect(() => {
        const controller = new AbortController();

        async function loadInitialOrder() {
            if (!token) {
                setError("Faça login para consultar este pedido.");
                setIsLoading(false);
                return;
            }

            try {
                setIsLoading(true);
                setError(null);
                await loadOrder(controller.signal);
            } catch (requestError) {
                if (controller.signal.aborted) return;

                setError(
                    requestError instanceof Error
                        ? requestError.message
                        : "Não foi possível carregar este pedido.",
                );
            } finally {
                if (!controller.signal.aborted) setIsLoading(false);
            }
        }

        void loadInitialOrder();

        return () => controller.abort();
    }, [loadOrder, token]);

    const shouldPoll = Boolean(order && isTransientOrder(order));

    useEffect(() => {
        if (!shouldPoll) return;

        const controller = new AbortController();
        const deadline = Date.now() + 60_000;
        let timeoutId: ReturnType<typeof setTimeout> | undefined;

        async function poll() {
            try {
                const currentOrder = await loadOrder(controller.signal);
                if (
                    currentOrder &&
                    isTransientOrder(currentOrder) &&
                    Date.now() < deadline
                ) {
                    timeoutId = setTimeout(poll, 5000);
                }
            } catch {
                // Mantém o último estado válido e deixa a atualização manual disponível.
            }
        }

        timeoutId = setTimeout(poll, 5000);

        return () => {
            controller.abort();
            if (timeoutId) clearTimeout(timeoutId);
        };
    }, [loadOrder, shouldPoll]);

    async function refreshOrder() {
        setIsRefreshing(true);
        try {
            await loadOrder();
            setNotice(
                "Os dados de pagamento e entrega foram consultados novamente.",
            );
        } catch (requestError) {
            setError(
                requestError instanceof Error
                    ? requestError.message
                    : "Não foi possível atualizar este pedido.",
            );
        } finally {
            setIsRefreshing(false);
        }
    }

    return (
        <main className="mx-auto min-h-screen max-w-6xl px-4 py-10 font-public md:px-8 md:py-14">
            <Link
                className="inline-flex min-h-11 items-center gap-2 rounded-lg px-2 text-sm font-bold text-slate-700 hover:bg-white hover:text-primary"
                href="/perfil#pedidos"
            >
                <span
                    aria-hidden="true"
                    className="material-symbols-outlined text-xl"
                >
                    arrow_back
                </span>
                Voltar aos meus pedidos
            </Link>

            {isLoading ? (
                <div
                    aria-busy="true"
                    aria-label="Carregando pedido"
                    className="mt-8 animate-pulse"
                >
                    <div className="h-52 rounded-2xl bg-white" />
                    <div className="mt-6 grid gap-6 lg:grid-cols-[minmax(0,1fr)_21rem]">
                        <div className="h-[34rem] rounded-2xl bg-white" />
                        <div className="h-96 rounded-2xl bg-white" />
                    </div>
                </div>
            ) : null}

            {!isLoading && order ? (
                <div className="mt-8">
                    <OrderDetails
                        isRefreshing={isRefreshing}
                        onRefresh={() => void refreshOrder()}
                        order={order}
                    />
                </div>
            ) : null}

            <FeedbackDialog
                confirmLabel={
                    token ? "Voltar aos meus pedidos" : "Ir para entrar"
                }
                description={error ?? ""}
                onOpenChange={(open) => {
                    if (!open) setError(null);
                }}
                onConfirm={() => {
                    router.push(
                        token
                            ? "/perfil#pedidos"
                            : `/login?next=${encodeURIComponent(`/perfil/pedidos/${orderUuid}`)}`,
                    );
                }}
                open={Boolean(error)}
                title="Não foi possível consultar o pedido"
            />
            <FeedbackDialog
                description={notice ?? ""}
                onOpenChange={(open) => !open && setNotice(null)}
                open={Boolean(notice)}
                title="Pedido atualizado"
            />
        </main>
    );
}
