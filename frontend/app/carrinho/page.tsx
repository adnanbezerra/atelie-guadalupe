import { CartPageClient } from "@/components/cart/cart-page-client";
import { ServerHeader } from "@/components/header/server";
import { SiteFooter } from "@/components/site/site-footer";
import { fetchCart } from "@/lib/server-api";

export default async function CartPage() {
    const cartResult = await Promise.allSettled([fetchCart()]);
    const initialCart =
        cartResult[0].status === "fulfilled" ? cartResult[0].value : null;

    return (
        <div className="min-h-screen bg-[#f6f6f8] text-slate-900">
            <ServerHeader />
            <CartPageClient initialCart={initialCart} />
            <SiteFooter />
        </div>
    );
}
