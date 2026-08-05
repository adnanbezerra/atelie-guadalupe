import { ManualPaymentLinkClient } from "@/components/checkout/manual-payment-link-client";
import { ServerHeader } from "@/components/header/server";
import { SiteFooter } from "@/components/site/site-footer";

export default async function ManualPaymentLinkPage({
    params,
}: {
    params: Promise<{ uuid: string }>;
}) {
    const { uuid } = await params;

    return (
        <>
            <ServerHeader />
            <ManualPaymentLinkClient uuid={uuid} />
            <SiteFooter />
        </>
    );
}
