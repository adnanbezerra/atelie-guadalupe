import { AdminDashboardClient } from "@/components/admin/admin-dashboard-client";
import { ApiError } from "@/lib/api-error";
import { fetchAdminDashboard, fetchMarketing } from "@/lib/server-api";
import { redirect } from "next/navigation";

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
    const dashboardError =
        dashboardResult.status === "rejected" ? dashboardResult.reason : null;

    if (dashboardError instanceof ApiError && dashboardError.status === 401) {
        redirect("/login?next=%2Fadmin");
    }

    const initialError =
        dashboardError != null
            ? "Não foi possível carregar os dados do painel. Recarregue a página para tentar novamente."
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
