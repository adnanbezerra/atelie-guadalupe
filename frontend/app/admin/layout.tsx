import { AdminShell } from "@/components/admin/admin-shell";

export default async function AdminLayout({
    children,
}: Readonly<{
    children: React.ReactNode;
}>) {
    return <AdminShell>{children}</AdminShell>;
}
