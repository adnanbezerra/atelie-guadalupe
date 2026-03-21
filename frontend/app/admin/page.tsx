import { AdminDashboardClient } from "@/components/admin/admin-dashboard-client";
import { fetchOrders, fetchProducts } from "@/lib/server-api";

export default async function AdminDashboardPage() {
    const [ordersResult, productsResult] = await Promise.allSettled([
        fetchOrders(),
        fetchProducts({ page: 1, pageSize: 40 }),
    ]);

    const initialOrders =
        ordersResult.status === "fulfilled" ? ordersResult.value.orders : [];
    const initialProducts =
        productsResult.status === "fulfilled" ? productsResult.value.items : [];

    return (
        <AdminDashboardClient
            initialOrders={initialOrders}
            initialProducts={initialProducts}
        />
    );
}
