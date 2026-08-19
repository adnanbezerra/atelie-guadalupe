import type { Metadata } from "next";
import { CheckoutSuccessDialog } from "@/components/checkout/checkout-success-dialog";
import { ServerHeader } from "@/components/header/server";
import { SiteFooter } from "@/components/site/site-footer";

export const metadata: Metadata = {
    title: "Retorno do pagamento | Ateliê Guadalupe",
};

export default function CheckoutSuccessPage() {
    return (
        <div className="flex min-h-screen flex-col bg-background text-foreground">
            <ServerHeader />
            <main className="bg-sacred-texture flex-1" />
            <SiteFooter />
            <CheckoutSuccessDialog />
        </div>
    );
}
