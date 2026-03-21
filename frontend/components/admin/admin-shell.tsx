"use client";

import { usePathname } from "next/navigation";
import { AdminSidebar } from "./admin-sidebar";

type AdminShellProps = {
    children: React.ReactNode;
};

export function AdminShell({ children }: AdminShellProps) {
    const pathname = usePathname();

    return (
        <div className="min-h-screen bg-[#f6f6f8] text-slate-900">
            <div className="flex h-screen overflow-hidden">
                <AdminSidebar pathname={pathname} />
                <main className="flex-1 overflow-y-auto">{children}</main>
            </div>
        </div>
    );
}
