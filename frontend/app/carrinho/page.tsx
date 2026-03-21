import { CartPageClient } from "@/components/cart/cart-page-client";
import { fetchCart } from "@/lib/server-api";

export default async function CartPage() {
    const cartResult = await Promise.allSettled([fetchCart()]);
    const initialCart =
        cartResult[0].status === "fulfilled" ? cartResult[0].value : null;

    return <CartPageClient initialCart={initialCart} />;
}
