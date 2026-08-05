import { AdminBillingClient } from "@/components/admin/admin-billing-client";
import { fetchPaymentLinks } from "@/lib/server-api";

export default async function AdminBillingPage() {
    const paymentLinksResult = await Promise.allSettled([
        fetchPaymentLinks({ page: 1, pageSize: 8 }),
    ]);
    const initialPaymentLinks =
        paymentLinksResult[0].status === "fulfilled"
            ? paymentLinksResult[0].value.items
            : [];

    return <AdminBillingClient initialPaymentLinks={initialPaymentLinks} />;
}
