import { AdminDashboardClient } from "@/components/admin/admin-dashboard-client";
import { fetchAdminDashboard, fetchMarketing } from "@/lib/server-api";

export default async function AdminDashboardPage() {
    const to = new Date();
    const from = new Date(to);
    from.setUTCDate(from.getUTCDate() - 29);
    from.setUTCHours(0, 0, 0, 0);
    const [dashboardResult, marketingResult] = await Promise.allSettled([
        fetchAdminDashboard({ from: from.toISOString(), to: to.toISOString() }),
        fetchMarketing(),
    ]);

    const dashboard =
        dashboardResult.status === "fulfilled" ? dashboardResult.value : null;
    const initialError =
        dashboardResult.status === "rejected"
            ? dashboardResult.reason instanceof Error
                ? dashboardResult.reason.message
                : "Não foi possível carregar o painel."
            : null;
    const initialMarketing =
        marketingResult.status === "fulfilled" ? marketingResult.value : null;

    return (
        <AdminDashboardClient
            dashboard={dashboard}
            initialError={initialError}
            initialMarketing={initialMarketing}
        />
    );
}
