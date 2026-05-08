"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
} from "@/components/ui/dialog";
import { clearAuthSession } from "@/lib/auth-session";
import { useApiToken } from "@/hooks/use-api-token";
import { useProfile } from "@/hooks/use-profile";

export function UserDialogButton() {
    const router = useRouter();
    const token = useApiToken();
    const isLoggedIn = Boolean(token);
    const profile = useProfile();
    const isAdmin = ["ADMIN", "SUBADMIN"].includes(profile.user?.role || "");

    function handleLogout() {
        clearAuthSession();
        router.push("/");
        router.refresh();
    }

    return (
        <Dialog>
            <DialogTrigger asChild>
                <button
                    aria-label="Abrir menu do usuário"
                    className="rounded-lg bg-slate-100 p-2"
                    type="button"
                >
                    <span className="material-symbols-outlined text-slate-700">
                        account_circle
                    </span>
                </button>
            </DialogTrigger>
            <DialogContent className="!left-auto !right-6 !top-[76px] w-[calc(100vw-3rem)] max-w-xs !translate-x-0 !translate-y-0 overflow-hidden rounded-xl bg-white p-0 shadow-2xl md:!right-10 lg:!right-[max(2.5rem,calc((100vw-80rem)/2))]">
                <DialogHeader className="border-b border-slate-100 p-5">
                    <DialogTitle className="flex items-center gap-2 text-base font-bold text-slate-900">
                        <span className="material-symbols-outlined text-primary">
                            account_circle
                        </span>
                        {isLoggedIn
                            ? `Salve Maria, ${profile.user?.name.split(" ")[0] || "Usuário"}!`
                            : "Salve Maria, visitante!"}
                    </DialogTitle>
                    <DialogDescription className="text-sm text-slate-500">
                        {isLoggedIn
                            ? "Gerencie seu cadastro e acompanhe seus pedidos."
                            : "Entre ou crie uma conta para continuar."}
                    </DialogDescription>
                </DialogHeader>

                <div className="space-y-2 p-4">
                    {isLoggedIn ? (
                        <>
                            {isAdmin && (
                                <Link
                                    className="flex w-full items-center gap-3 rounded-lg px-3 py-3 text-sm font-bold text-slate-700 hover:bg-slate-100"
                                    href="/admin"
                                >
                                    <span className="material-symbols-outlined">
                                        admin_panel_settings
                                    </span>
                                    Administração
                                </Link>
                            )}
                            <Link
                                className="flex w-full items-center gap-3 rounded-lg px-3 py-3 text-sm font-bold text-slate-700 hover:bg-slate-100"
                                href="/perfil"
                            >
                                <span className="material-symbols-outlined text-base">
                                    edit
                                </span>
                                Editar perfil
                            </Link>
                            <Link
                                className="flex w-full items-center gap-3 rounded-lg px-3 py-3 text-sm font-bold text-slate-700 hover:bg-slate-100"
                                href="/pedidos"
                            >
                                <span className="material-symbols-outlined text-base">
                                    receipt_long
                                </span>
                                Pedidos recentes
                            </Link>
                            <button
                                className="flex w-full items-center gap-3 rounded-lg px-3 py-3 text-left text-sm font-bold text-red-600 hover:bg-red-50"
                                onClick={handleLogout}
                                type="button"
                            >
                                <span className="material-symbols-outlined text-base">
                                    logout
                                </span>
                                Sair
                            </button>
                        </>
                    ) : (
                        <>
                            <Link
                                className="flex w-full items-center justify-center gap-2 rounded-lg bg-primary px-4 py-3 text-sm font-bold text-white shadow-lg shadow-primary/20 hover:brightness-110"
                                href="/login"
                            >
                                <span className="material-symbols-outlined text-base">
                                    login
                                </span>
                                Fazer login
                            </Link>
                            <Link
                                className="flex w-full items-center justify-center gap-2 rounded-lg border border-slate-200 bg-white px-4 py-3 text-sm font-bold text-slate-900 hover:bg-slate-50"
                                href="/cadastro"
                            >
                                <span className="material-symbols-outlined text-base">
                                    person_add
                                </span>
                                Criar conta
                            </Link>
                        </>
                    )}
                </div>
            </DialogContent>
        </Dialog>
    );
}
