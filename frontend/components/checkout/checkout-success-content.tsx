"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useCallback, useEffect, useMemo, useState } from "react";
import { FeedbackDialog } from "@/components/shared/feedback-dialog";
import { useApiToken } from "@/hooks/use-api-token";
import { getOrder } from "@/lib/api";
import type { Order } from "@/lib/types";
import { formatCurrency } from "@/lib/utils";
import {
    getDeliveryMessage,
    getPaymentMessage,
    PAYMENT_CONFIRMED_STATUSES,
    PAYMENT_PROBLEM_STATUSES,
    readStoredOrderUuid,
    storeOrder,
} from "./checkout-utils";

type VerificationState = "loading" | "missing-auth" | "missing-order" | "ready";

type VerificationDialog = {
    title: string;
    description: string;
} | null;

export function CheckoutSuccessContent() {
    const searchParams = useSearchParams();
    const token = useApiToken();
    const orderUuidFromUrl = searchParams.get("orderUuid");
    const [order, setOrder] = useState<Order | null>(null);
    const [state, setState] = useState<VerificationState>("loading");
    const [dialog, setDialog] = useState<VerificationDialog>(null);
    const [isRefreshing, setIsRefreshing] = useState(false);

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

    const orderUuid = useMemo(() => {
        if (orderUuidFromUrl) return orderUuidFromUrl;
        if (typeof window === "undefined") return null;
        return readStoredOrderUuid();
    }, [orderUuidFromUrl]);

    const loadOrder = useCallback(
        async (signal?: AbortSignal) => {
            if (!token || !orderUuid) return null;
            const response = await getOrder(token, orderUuid, signal);
            storeOrder(response.order);
            setOrder(response.order);
            setState("ready");
            setDialog(null);
            return response.order;
        },
        [orderUuid, token],
    );

    useEffect(() => {
        if (!token) {
            setState("missing-auth");
            setDialog({
                title: "Entre para verificar o pagamento",
                description:
                    "Esta página não confirma um pagamento sozinha. Entre na sua conta para consultar o pedido com segurança.",
            });
            return;
        }

        if (!orderUuid) {
            setState("missing-order");
            setDialog({
                title: "Pedido não identificado",
                description:
                    "Não encontramos o número do pedido nesta página. Abra seus pedidos para conferir o pagamento correto.",
            });
            return;
        }

        const controller = new AbortController();
        setState("loading");

        void loadOrder(controller.signal).catch((error) => {
            if (controller.signal.aborted) return;
            setState("missing-order");
            setDialog({
                title: "Não foi possível verificar o pagamento",
                description:
                    error instanceof Error
                        ? error.message
                        : "Confira sua conexão e tente novamente pelos seus pedidos.",
            });
        });

        return () => controller.abort();
    }, [loadOrder, orderUuid, token]);

    const shouldPoll = Boolean(order && !paymentConfirmed && !paymentProblem);

    useEffect(() => {
        if (!shouldPoll) return;

        const controller = new AbortController();
        const deadline = Date.now() + 60_000;
        let timeoutId: ReturnType<typeof setTimeout> | undefined;

        async function poll() {
            try {
                const currentOrder = await loadOrder(controller.signal);
                const finished =
                    !currentOrder ||
                    PAYMENT_CONFIRMED_STATUSES.has(currentOrder.status) ||
                    currentOrder.payment?.status === "PAID" ||
                    currentOrder.status === "CANCELLED" ||
                    PAYMENT_PROBLEM_STATUSES.has(
                        currentOrder.payment?.status ?? "",
                    );

                if (!finished && Date.now() < deadline) {
                    timeoutId = setTimeout(poll, 3000);
                }
            } catch {
                // A atualização manual permanece disponível sem apagar o último estado válido.
            }
        }

        timeoutId = setTimeout(poll, 3000);

        return () => {
            controller.abort();
            if (timeoutId) clearTimeout(timeoutId);
        };
    }, [loadOrder, shouldPoll]);

    async function refreshOrder() {
        setIsRefreshing(true);
        try {
            await loadOrder();
        } catch (error) {
            setDialog({
                title: "Não foi possível atualizar o pedido",
                description:
                    error instanceof Error
                        ? error.message
                        : "Confira sua conexão e tente novamente.",
            });
        } finally {
            setIsRefreshing(false);
        }
    }

    const statusTitle = order
        ? getPaymentMessage(order)
        : state === "loading"
          ? "Verificando seu pagamento"
          : "Pagamento ainda não verificado";
    const statusDescription = order
        ? paymentConfirmed
            ? getDeliveryMessage(order)
            : paymentProblem
              ? "O pedido está salvo, mas precisa de atenção. Consulte os detalhes ou fale com o atendimento."
              : "A confirmação ainda não chegou. Esta página consulta o pedido por um tempo limitado e você pode atualizar quando quiser."
        : "Só mostramos uma confirmação depois de consultar o pedido autenticado.";

    return (
        <section
            aria-labelledby="checkout-success-title"
            className="w-full max-w-3xl overflow-hidden rounded-2xl bg-white shadow-[0_24px_60px_-32px_rgba(15,23,42,0.4)]"
        >
            <div
                className={`${paymentConfirmed ? "bg-success" : paymentProblem ? "bg-red-700" : "bg-primary"} px-6 py-8 text-white sm:px-10 sm:py-10`}
            >
                <span
                    aria-hidden="true"
                    className={`material-symbols-outlined flex size-14 items-center justify-center rounded-full bg-white text-3xl text-slate-900 shadow-sm ${state === "loading" ? "animate-spin motion-reduce:animate-none" : ""}`}
                >
                    {state === "loading"
                        ? "progress_activity"
                        : paymentConfirmed
                          ? "check_circle"
                          : paymentProblem
                            ? "error"
                            : "hourglass_top"}
                </span>
                <h1
                    className="mt-6 max-w-xl text-balance font-display text-3xl font-bold leading-tight sm:text-4xl"
                    id="checkout-success-title"
                >
                    {statusTitle}
                </h1>
                <p className="mt-3 max-w-xl text-base leading-7 text-white/90 sm:text-lg">
                    {statusDescription}
                </p>
            </div>

            <div className="px-6 py-7 sm:px-10 sm:py-9">
                {order ? (
                    <dl className="grid gap-4 rounded-xl bg-[#f8f5ef] p-5 text-sm sm:grid-cols-3">
                        <ReceiptItem
                            label="Pedido"
                            value={`#${order.uuid.slice(0, 8)}`}
                        />
                        <ReceiptItem
                            label="Total"
                            value={formatCurrency(order.totalInCents)}
                        />
                        <ReceiptItem
                            label="Entrega"
                            value={getDeliveryMessage(order)}
                        />
                    </dl>
                ) : null}

                <div className="mt-7 flex flex-col gap-3 sm:flex-row sm:flex-wrap">
                    {order && !paymentConfirmed && !paymentProblem ? (
                        <button
                            className="min-h-12 rounded-lg bg-primary px-5 py-3 font-bold text-white focus:outline-none focus:ring-4 focus:ring-primary/30 disabled:opacity-60"
                            disabled={isRefreshing}
                            onClick={() => void refreshOrder()}
                            type="button"
                        >
                            {isRefreshing
                                ? "Atualizando..."
                                : "Atualizar pagamento"}
                        </button>
                    ) : null}
                    {order?.payment?.checkoutUrl && !paymentConfirmed ? (
                        <a
                            className="flex min-h-12 items-center justify-center rounded-lg border border-slate-200 px-5 py-3 font-bold text-primary"
                            href={order.payment.checkoutUrl}
                        >
                            Voltar ao pagamento
                        </a>
                    ) : null}
                    {token ? (
                        <Link
                            className="flex min-h-12 items-center justify-center rounded-lg border border-slate-200 px-5 py-3 font-bold text-primary"
                            href={
                                order
                                    ? `/perfil/pedidos/${order.uuid}`
                                    : "/perfil#pedidos"
                            }
                        >
                            {order ? "Ver detalhes do pedido" : "Ver meus pedidos"}
                        </Link>
                    ) : (
                        <Link
                            className="flex min-h-12 items-center justify-center rounded-lg bg-primary px-5 py-3 font-bold text-white"
                            href={`/login?next=${encodeURIComponent("/checkout/success")}`}
                        >
                            Entrar para verificar
                        </Link>
                    )}
                    <Link
                        className="flex min-h-12 items-center justify-center rounded-lg px-5 py-3 font-bold text-slate-700"
                        href="/"
                    >
                        Voltar ao início
                    </Link>
                </div>
            </div>

            <FeedbackDialog
                description={dialog?.description ?? ""}
                onOpenChange={(open) => !open && setDialog(null)}
                open={dialog != null}
                title={dialog?.title ?? ""}
            />
        </section>
    );
}

function ReceiptItem({ label, value }: { label: string; value: string }) {
    return (
        <div className="min-w-0">
            <dt className="font-bold text-slate-500">{label}</dt>
            <dd className="mt-1 [overflow-wrap:anywhere] font-bold text-slate-950">
                {value}
            </dd>
        </div>
    );
}
