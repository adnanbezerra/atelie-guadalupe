"use client";

import Image from "next/image";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import logo from "public/logo-empty.png";
import {
    Dialog,
    DialogClose,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
} from "@/components/ui/dialog";
import { cn } from "@/lib/utils";
import { clearAuthSession } from "@/lib/auth-session";
import { AdminSidebar, adminNavItems } from "./admin-sidebar";
import { useUser } from "@/hooks/use-user";

type AdminShellProps = {
    children: React.ReactNode;
};

export function AdminShell({ children }: AdminShellProps) {
    const pathname = usePathname();
    const router = useRouter();
    const { user } = useUser();
    const role = user?.role;

    function handleLogout() {
        clearAuthSession();
        router.replace("/login");
        router.refresh();
    }

    return (
        <div className="fixed inset-0 bg-[#f6f6f8] text-slate-900">
            <div className="flex h-full overflow-hidden">
                <AdminSidebar
                    onLogout={handleLogout}
                    pathname={pathname}
                    role={role}
                />
                <div className="flex min-h-0 min-w-0 flex-1 flex-col">
                    <AdminMobileHeader
                        onLogout={handleLogout}
                        pathname={pathname}
                        role={role}
                    />
                    <main className="min-h-0 flex-1 overflow-y-auto">
                        {children}
                    </main>
                </div>
            </div>
        </div>
    );
}

function AdminMobileHeader({
    onLogout,
    pathname,
    role,
}: {
    onLogout: () => void;
    pathname: string;
    role?: string;
}) {
    const visibleItems = adminNavItems.filter(
        (item) => item.href !== "/admin/usuarios" || role === "ADMIN",
    );
    return (
        <header className="flex h-16 items-center border-b border-slate-200 bg-white px-4 lg:hidden">
            <Dialog>
                <DialogTrigger asChild>
                    <button
                        aria-label="Abrir menu administrativo"
                        className="flex h-10 w-10 items-center justify-center rounded-lg bg-slate-100 text-slate-700"
                        type="button"
                    >
                        <span className="material-symbols-outlined">menu</span>
                    </button>
                </DialogTrigger>
                <DialogContent className="!left-0 !top-0 flex h-dvh w-[min(22rem,calc(100vw-2rem))] max-w-none !translate-x-0 !translate-y-0 flex-col rounded-none rounded-r-2xl bg-white p-0 shadow-2xl">
                    <DialogHeader className="border-b border-slate-200 p-6">
                        <DialogTitle className="flex items-center gap-3 text-left">
                            <Image
                                alt="Logo do Ateliê Guadalupe"
                                className="h-12 w-auto"
                                src={logo}
                            />
                            <span>
                                <span className="block text-lg font-bold leading-tight text-primary">
                                    Ateliê Guadalupe
                                </span>
                                <span className="block text-xs font-medium uppercase tracking-wider text-slate-500">
                                    Administração
                                </span>
                            </span>
                        </DialogTitle>
                    </DialogHeader>
                    <nav className="space-y-1 p-4">
                        {visibleItems.map((item) => {
                            const isActive =
                                item.href === "/admin"
                                    ? pathname === "/admin"
                                    : item.href === "/admin/produtos"
                                      ? pathname === item.href ||
                                        (pathname.startsWith(`${item.href}/`) &&
                                            pathname !== "/admin/produtos/novo")
                                      : pathname.startsWith(item.href);

                            return (
                                <DialogClose asChild key={item.href}>
                                    <Link
                                        className={cn(
                                            "flex items-center gap-3 rounded-lg px-3 py-3 text-sm font-medium",
                                            isActive
                                                ? "bg-primary text-white"
                                                : "text-slate-600 hover:bg-slate-100",
                                        )}
                                        href={item.href}
                                    >
                                        <span className="material-symbols-outlined">
                                            {item.icon}
                                        </span>
                                        {item.label}
                                    </Link>
                                </DialogClose>
                            );
                        })}
                    </nav>
                    <div className="mt-auto border-t border-slate-200 p-4">
                        <DialogClose asChild>
                            <Link
                                className="flex items-center gap-3 rounded-lg px-3 py-3 text-sm font-medium text-slate-600 hover:bg-slate-100"
                                href="/"
                            >
                                <span className="material-symbols-outlined">
                                    storefront
                                </span>
                                Visão de usuário
                            </Link>
                        </DialogClose>
                        <button
                            className="flex w-full items-center gap-3 rounded-lg px-3 py-3 text-sm font-medium text-red-600 hover:bg-red-50"
                            onClick={onLogout}
                            type="button"
                        >
                            <span className="material-symbols-outlined">
                                logout
                            </span>
                            Sair
                        </button>
                    </div>
                </DialogContent>
            </Dialog>
            <div className="flex items-center ml-2 gap-3">
                <Image
                    alt="Logo do Ateliê Guadalupe"
                    className="h-10 w-auto"
                    src={logo}
                />
                <div>
                    <p className="text-sm font-bold leading-tight text-primary">
                        Ateliê Guadalupe
                    </p>
                    <p className="text-xs font-medium uppercase tracking-wider text-slate-500">
                        Administração
                    </p>
                </div>
            </div>
        </header>
    );
}
