import { AdminBillingClient } from "@/components/admin/admin-billing-client";
import { fetchOrders, fetchProducts } from "@/lib/server-api";

export default async function AdminBillingPage() {
    const [ordersResult, productsResult] = await Promise.allSettled([
        fetchOrders(),
        fetchProducts({ page: 1, pageSize: 24 }),
    ]);

    const initialOrders =
        ordersResult.status === "fulfilled" ? ordersResult.value.orders : [];
    const initialProducts =
        productsResult.status === "fulfilled" ? productsResult.value.items : [];

    return (
        <AdminBillingClient
            initialOrders={initialOrders}
            initialProducts={initialProducts}
        />
    );
}
