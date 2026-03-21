"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { User } from "@/lib/types";
import { getInitials } from "@/lib/utils";

type AdminShellProps = {
    children: React.ReactNode;
    currentUser: User | null;
};

export function AdminShell({ children, currentUser }: AdminShellProps) {
    const pathname = usePathname();

    if (pathname !== "/admin/cobranca" && pathname !== "/admin/usuarios") {
        return <>{children}</>;
    }

    const billingShell = pathname === "/admin/cobranca";

    return (
        <div className="min-h-screen bg-[#f6f6f8] text-slate-900">
            <div className="flex h-screen overflow-hidden">
                <aside className="flex w-64 flex-col border-r border-slate-200 bg-white">
                    <div className="p-6">
                        <div className="flex items-center gap-3">
                            <div
                                className={
                                    billingShell
                                        ? "size-8 text-primary"
                                        : "flex size-8 items-center justify-center rounded-lg bg-primary text-white"
                                }
                            >
                                {billingShell ? (
                                    <svg
                                        fill="currentColor"
                                        viewBox="0 0 48 48"
                                        xmlns="http://www.w3.org/2000/svg"
                                    >
                                        <path d="M44 4H30.6666V17.3334H17.3334V30.6666H4V44H44V4Z" />
                                    </svg>
                                ) : (
                                    <span className="material-symbols-outlined">
                                        brush
                                    </span>
                                )}
                            </div>
                            <div>
                                <h2 className="font-display text-lg font-bold text-primary">
                                    {billingShell ? "Guadalupe" : "Ateliê Guadalupe"}
                                </h2>
                                {billingShell ? null : (
                                    <p className="text-xs font-medium uppercase tracking-wider text-slate-500">
                                        Administração
                                    </p>
                                )}
                            </div>
                        </div>
                    </div>
                    <nav className="flex-1 space-y-1 px-4">
                        {billingShell ? (
                            <>
                                <p className="mb-2 px-3 text-xs font-semibold uppercase tracking-wider text-slate-400">
                                    Menu Principal
                                </p>
                                <Link
                                    className="flex items-center gap-3 rounded-lg px-3 py-2 text-slate-600"
                                    href="/admin"
                                >
                                    <span className="material-symbols-outlined">
                                        dashboard
                                    </span>
                                    <span className="text-sm font-medium">
                                        Dashboard
                                    </span>
                                </Link>
                                <Link
                                    className="flex items-center gap-3 rounded-lg bg-primary/10 px-3 py-2 text-primary"
                                    href="/admin/cobranca"
                                >
                                    <span className="material-symbols-outlined">
                                        payments
                                    </span>
                                    <span className="text-sm font-medium">
                                        Vendas & Checkout
                                    </span>
                                </Link>
                                <Link
                                    className="flex items-center gap-3 rounded-lg px-3 py-2 text-slate-600"
                                    href="/admin/produtos"
                                >
                                    <span className="material-symbols-outlined">
                                        inventory_2
                                    </span>
                                    <span className="text-sm font-medium">
                                        Produtos
                                    </span>
                                </Link>
                                <Link
                                    className="flex items-center gap-3 rounded-lg px-3 py-2 text-slate-600"
                                    href="/admin/usuarios"
                                >
                                    <span className="material-symbols-outlined">
                                        group
                                    </span>
                                    <span className="text-sm font-medium">
                                        Clientes
                                    </span>
                                </Link>
                            </>
                        ) : (
                            <>
                                <Link
                                    className="flex items-center gap-3 rounded-lg px-4 py-3 text-slate-600 transition-colors hover:bg-primary/10 hover:text-primary"
                                    href="/admin"
                                >
                                    <span className="material-symbols-outlined">
                                        dashboard
                                    </span>
                                    <span className="text-sm font-medium">
                                        Dashboard
                                    </span>
                                </Link>
                                <Link
                                    className="flex items-center gap-3 rounded-lg bg-primary/10 px-4 py-3 text-primary"
                                    href="/admin/usuarios"
                                >
                                    <span className="material-symbols-outlined">
                                        group
                                    </span>
                                    <span className="text-sm font-medium">
                                        Administradores
                                    </span>
                                </Link>
                                <Link
                                    className="flex items-center gap-3 rounded-lg px-4 py-3 text-slate-600 transition-colors hover:bg-primary/10 hover:text-primary"
                                    href="/admin/cobranca"
                                >
                                    <span className="material-symbols-outlined">
                                        shopping_bag
                                    </span>
                                    <span className="text-sm font-medium">
                                        Vendas
                                    </span>
                                </Link>
                                <Link
                                    className="flex items-center gap-3 rounded-lg px-4 py-3 text-slate-600 transition-colors hover:bg-primary/10 hover:text-primary"
                                    href="/admin/produtos"
                                >
                                    <span className="material-symbols-outlined">
                                        inventory_2
                                    </span>
                                    <span className="text-sm font-medium">
                                        Produtos
                                    </span>
                                </Link>
                            </>
                        )}
                    </nav>
                    <div className="border-t border-slate-200 p-4">
                        {billingShell ? (
                            <Link
                                className="flex items-center gap-3 rounded-lg px-3 py-2 text-slate-600"
                                href="/admin"
                            >
                                <span className="material-symbols-outlined">
                                    settings
                                </span>
                                <span className="text-sm font-medium">
                                    Configurações
                                </span>
                            </Link>
                        ) : (
                            <div className="flex items-center gap-3 p-2">
                                <div className="flex size-10 items-center justify-center rounded-full bg-primary/20 font-bold text-primary">
                                    {currentUser ? getInitials(currentUser.name) : "AG"}
                                </div>
                                <div>
                                    <p className="text-xs font-bold">
                                        {currentUser?.name ?? "Admin Master"}
                                    </p>
                                    <p className="text-[10px] text-slate-500">
                                        Sair da conta
                                    </p>
                                </div>
                            </div>
                        )}
                    </div>
                </aside>

                <main className="flex-1 overflow-y-auto">
                    <header className="flex h-16 items-center justify-between border-b border-slate-200 bg-white px-8">
                        {billingShell ? (
                            <h2 className="font-display text-lg font-semibold">
                                Painel Administrativo
                            </h2>
                        ) : (
                            <div className="flex items-center gap-2 text-slate-500">
                                <span className="text-sm">Painel de Controle</span>
                                <span className="material-symbols-outlined text-sm">
                                    chevron_right
                                </span>
                                <span className="text-sm font-bold text-slate-900">
                                    Administradores
                                </span>
                            </div>
                        )}
                        <div className="flex items-center gap-4">
                            <button className="relative rounded-full p-2 text-slate-500 transition-colors hover:bg-slate-100">
                                <span className="material-symbols-outlined">
                                    notifications
                                </span>
                                <span className="absolute right-2 top-2 size-2 rounded-full bg-red-500" />
                            </button>
                            {billingShell ? (
                                <div className="flex items-center gap-3 border-l border-slate-200 pl-4">
                                    <div className="text-right">
                                        <p className="text-sm font-semibold">
                                            {currentUser?.name ?? "Admin Guadalupe"}
                                        </p>
                                        <p className="text-xs text-slate-500">
                                            {currentUser?.role ?? "Gestor"}
                                        </p>
                                    </div>
                                    <div className="flex size-10 items-center justify-center rounded-full bg-primary/20 font-bold text-primary">
                                        {currentUser ? getInitials(currentUser.name) : "AG"}
                                    </div>
                                </div>
                            ) : (
                                <button className="rounded-full p-2 text-slate-500 transition-colors hover:bg-slate-100">
                                    <span className="material-symbols-outlined">
                                        search
                                    </span>
                                </button>
                            )}
                        </div>
                    </header>
                    <div className="p-8">{children}</div>
                </main>
            </div>
        </div>
    );
}
