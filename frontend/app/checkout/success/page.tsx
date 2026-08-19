import type { Metadata } from "next";
import { CheckoutSuccessContent } from "@/components/checkout/checkout-success-content";
import { ServerHeader } from "@/components/header/server";
import { SiteFooter } from "@/components/site/site-footer";

export const metadata: Metadata = {
    title: "Pagamento recebido | Ateliê Guadalupe",
};

export default function CheckoutSuccessPage() {
    return (
        <div className="flex min-h-screen flex-col bg-background text-foreground">
            <ServerHeader />
            <main className="flex flex-1 items-center justify-center px-4 py-12 sm:px-6 sm:py-16">
                <CheckoutSuccessContent />
            </main>
            <SiteFooter />
        </div>
    );
}
