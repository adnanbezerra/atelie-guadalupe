"use client";

import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
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
import { AdminSidebar, adminNavItems } from "./admin-sidebar";

type AdminShellProps = {
    children: React.ReactNode;
};

export function AdminShell({ children }: AdminShellProps) {
    const pathname = usePathname();

    return (
        <div className="min-h-screen bg-[#f6f6f8] text-slate-900">
            <div className="flex h-screen overflow-hidden">
                <AdminSidebar pathname={pathname} />
                <div className="flex min-w-0 flex-1 flex-col">
                    <AdminMobileHeader pathname={pathname} />
                    <main className="flex-1 overflow-y-auto">{children}</main>
                </div>
            </div>
        </div>
    );
}

function AdminMobileHeader({ pathname }: { pathname: string }) {
    return (
        <header className="flex h-16 items-center justify-between border-b border-slate-200 bg-white px-4 lg:hidden">
            <div className="flex items-center gap-3">
                <Image
                    alt="Logo do Ateliê Guadalupe"
                    className="h-10 w-auto"
                    src={logo}
                />
                <div>
                    <p className="text-sm font-bold leading-tight text-primary">
                        Ateliê Guadalupe
                    </p>
                    <p className="text-[10px] font-medium uppercase tracking-wider text-slate-500">
                        Administração
                    </p>
                </div>
            </div>

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
                        {adminNavItems.map((item) => {
                            const isActive =
                                item.href === "/admin"
                                    ? pathname === "/admin"
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
        </header>
    );
}
