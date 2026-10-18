import { ManualPaymentLinkClient } from "@/components/checkout/manual-payment-link-client";
import { PaymentFlowHeader } from "@/components/checkout/payment-flow-header";
import { fetchPaymentLinkPreview } from "@/lib/server-api";

export default async function ManualPaymentLinkPage({
    params,
}: {
    params: Promise<{ uuid: string }>;
}) {
    const { uuid } = await params;
    const previewResult = await Promise.allSettled([
        fetchPaymentLinkPreview(uuid),
    ]);
    const preview =
        previewResult[0].status === "fulfilled"
            ? previewResult[0].value.paymentLink
            : null;
    const initialError =
        previewResult[0].status === "rejected"
            ? previewResult[0].reason instanceof Error
                ? previewResult[0].reason.message
                : "Não foi possível consultar esta cobrança."
            : null;

    return (
        <div className="flex min-h-screen flex-col bg-[#f6f6f8]">
            <PaymentFlowHeader />
            <ManualPaymentLinkClient
                initialError={initialError}
                preview={preview}
                uuid={uuid}
            />
        </div>
    );
}
