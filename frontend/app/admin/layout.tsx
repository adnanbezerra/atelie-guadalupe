import { AdminShell } from "@/components/admin/admin-shell";
import { fetchCurrentUser } from "@/lib/server-api";

export default async function AdminLayout({
    children,
}: Readonly<{
    children: React.ReactNode;
}>) {
    const userResult = await Promise.allSettled([fetchCurrentUser()]);
    const currentUser =
        userResult[0].status === "fulfilled" ? userResult[0].value.user : null;

    return <AdminShell currentUser={currentUser}>{children}</AdminShell>;
}
