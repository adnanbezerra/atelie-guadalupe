"use client";

import { useState } from "react";
import { usePathname } from "next/navigation";
import { Button } from "@/components/ui/button";
import { cn, getInitials } from "@/lib/utils";
import { User } from "@/lib/types";

type AdminShellProps = {
    children: React.ReactNode;
    currentUser: User | null;
};

const navItems = [
    { href: "/admin", label: "Painel" },
    { href: "/admin/produtos", label: "Produtos" },
    { href: "/admin/cobranca", label: "Cobranca" },
    { href: "/admin/usuarios", label: "Usuarios" },
];

export function AdminShell({ children, currentUser }: AdminShellProps) {
    const pathname = usePathname();
    const [open, setOpen] = useState(false);

    return (
        <div className="admin-grid min-h-screen bg-[#f6f6f8]">
            <div className="mx-auto flex min-h-screen max-w-[1600px]">
                <aside
                    className={cn(
                        "fixed inset-y-0 left-0 z-40 w-72 border-r border-slate-200 bg-white px-6 py-8 shadow-xl transition-transform lg:static lg:translate-x-0",
                        open ? "translate-x-0" : "-translate-x-full",
                    )}
                >
                    <div className="flex items-center justify-between">
                        <div>
                            <p className="font-display text-2xl font-bold text-primary">
                                Guadalupe
                            </p>
                            <p className="mt-1 text-xs uppercase tracking-[0.3em] text-slate-500">
                                Administracao
                            </p>
                        </div>
                        <button
                            className="rounded-full p-2 text-slate-500 lg:hidden"
                            onClick={() => setOpen(false)}
                            type="button"
                        >
                            Fechar
                        </button>
                    </div>
                    <nav className="mt-8 space-y-2">
                        {navItems.map((item) => {
                            const active = pathname === item.href;

                            return (
                                <a
                                    key={item.href}
                                    className={cn(
                                        "flex items-center rounded-2xl px-4 py-3 text-sm font-semibold",
                                        active
                                            ? "bg-primary text-white shadow-lg shadow-primary/20"
                                            : "text-slate-600 hover:bg-slate-100 hover:text-primary",
                                    )}
                                    href={item.href}
                                    onClick={() => setOpen(false)}
                                >
                                    {item.label}
                                </a>
                            );
                        })}
                    </nav>
                    <div className="mt-10 rounded-[1.75rem] border border-slate-200 bg-slate-50 p-4">
                        <p className="text-xs uppercase tracking-[0.25em] text-slate-500">
                            Sessao
                        </p>
                        <div className="mt-4 flex items-center gap-3">
                            <div className="flex size-12 items-center justify-center rounded-2xl bg-primary/10 font-semibold text-primary">
                                {currentUser
                                    ? getInitials(currentUser.name)
                                    : "AG"}
                            </div>
                            <div>
                                <p className="font-semibold text-slate-900">
                                    {currentUser?.name ?? "Administrador"}
                                </p>
                                <p className="text-sm text-slate-500">
                                    {currentUser?.email ??
                                        "Sem sessao autenticada"}
                                </p>
                            </div>
                        </div>
                    </div>
                </aside>
                <div className="min-w-0 flex-1">
                    <header className="sticky top-0 z-30 border-b border-white/80 bg-white/85 px-4 py-4 backdrop-blur sm:px-8">
                        <div className="flex items-center justify-between gap-4">
                            <div>
                                <p className="text-xs uppercase tracking-[0.35em] text-slate-500">
                                    Painel do Atelie
                                </p>
                                <h1 className="mt-1 font-display text-2xl font-bold text-slate-900">
                                    Operacao administrativa
                                </h1>
                            </div>
                            <div className="flex items-center gap-3">
                                <Button
                                    className="lg:hidden"
                                    onClick={() =>
                                        setOpen((current) => !current)
                                    }
                                    variant="outline"
                                >
                                    Menu
                                </Button>
                                <Button variant="outline">
                                    {currentUser?.role ?? "Sem token"}
                                </Button>
                            </div>
                        </div>
                    </header>
                    <div className="p-4 sm:p-8">{children}</div>
                </div>
            </div>
        </div>
    );
}
