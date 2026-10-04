import type { Metadata } from "next";
import { OrderDetailsClient } from "@/components/profile/order-details-client";
import { ServerHeader } from "@/components/header/server";
import { SiteFooter } from "@/components/site/site-footer";

export const metadata: Metadata = {
    title: "Detalhes do pedido | Ateliê Guadalupe",
};

export default async function OrderDetailsPage({
    params,
}: {
    params: Promise<{ uuid: string }>;
}) {
    const { uuid } = await params;

    return (
        <div className="min-h-screen bg-[#f6f6f8] text-slate-900">
            <ServerHeader />
            <OrderDetailsClient orderUuid={uuid} />
            <SiteFooter />
        </div>
    );
}
