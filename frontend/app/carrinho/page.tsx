import { CartPageClient } from "@/components/cart/cart-page-client";
import { SiteFooter } from "@/components/site/site-footer";
import { SiteHeader } from "@/components/site/site-header";
import { fetchCart, fetchProductLines } from "@/lib/server-api";

export default async function CartPage() {
    const [linesResult, cartResult] = await Promise.allSettled([
        fetchProductLines(),
        fetchCart(),
    ]);

    const lines =
        linesResult.status === "fulfilled" ? linesResult.value.lines : [];
    const initialCart =
        cartResult.status === "fulfilled" ? cartResult.value : null;

    return (
        <div className="min-h-screen">
            <SiteHeader lines={lines} />
            <CartPageClient initialCart={initialCart} />
            <SiteFooter />
        </div>
    );
}
