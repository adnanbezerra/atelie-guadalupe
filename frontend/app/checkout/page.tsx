import { CheckoutPageClient } from "@/components/checkout/checkout-page-client";
import { ServerHeader } from "@/components/header/server";
import { SiteFooter } from "@/components/site/site-footer";
import { fetchCart } from "@/lib/server-api";

export const dynamic = "force-dynamic";

export default async function CheckoutPage() {
    const cartResult = await Promise.allSettled([fetchCart()]);
    const cart =
        cartResult[0].status === "fulfilled" ? cartResult[0].value : null;

    return (
        <>
            <ServerHeader searchPath="/beleza-natural" />
            <CheckoutPageClient initialCart={cart} />
            <SiteFooter />
        </>
    );
}
