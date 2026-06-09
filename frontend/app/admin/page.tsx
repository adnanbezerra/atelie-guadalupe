import { AdminDashboardClient } from "@/components/admin/admin-dashboard-client";
import { fetchMarketing, fetchOrders } from "@/lib/server-api";

export default async function AdminDashboardPage() {
    const [ordersResult, marketingResult] = await Promise.allSettled([
        fetchOrders(),
        fetchMarketing(),
    ]);

    const initialOrders =
        ordersResult.status === "fulfilled" ? ordersResult.value.orders : [];
    const initialMarketing =
        marketingResult.status === "fulfilled" ? marketingResult.value : null;

    return (
        <AdminDashboardClient
            initialOrders={initialOrders}
            initialMarketing={initialMarketing}
        />
    );
}
