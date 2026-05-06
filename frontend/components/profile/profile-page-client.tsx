"use client";

import Link from "next/link";
import { useProfile } from "@/hooks/use-profile";

const navItems = [
    { href: "/perfil", icon: "person", label: "Dados Pessoais", active: true },
    {
        href: "/pedidos",
        icon: "shopping_bag",
        label: "Meus Pedidos",
        active: false,
    },
    {
        href: "/perfil#enderecos",
        icon: "location_on",
        label: "Endereços",
        active: false,
    },
    {
        href: "/perfil#pagamento",
        icon: "payments",
        label: "Pagamento",
        active: false,
    },
];

function avatarInitials(name?: string | null) {
    return (name || "AG")
        .split(" ")
        .filter(Boolean)
        .slice(0, 2)
        .map((part) => part[0]?.toUpperCase())
        .join("");
}

export function ProfilePageClient() {
    const profile = useProfile();
    const user = profile.user;
    const initials = avatarInitials(user?.name);

    return (
        <main className="mx-auto min-h-screen max-w-7xl px-4 py-12 font-public md:px-8">
            <div className="flex flex-col gap-12 md:flex-row">
                <aside className="w-full flex-shrink-0 md:w-64">
                    <div className="mb-8 px-2">
                        <h1 className="text-xl font-bold text-slate-900">
                            Minha Conta
                        </h1>
                        <p className="text-sm text-slate-500">
                            Gerencie seus dados e pedidos
                        </p>
                    </div>
                    <nav className="space-y-1">
                        {navItems.map((item) => (
                            <Link
                                className={
                                    item.active
                                        ? "flex items-center gap-3 rounded-xl bg-slate-900 px-4 py-3 text-white shadow-sm transition-all"
                                        : "flex items-center gap-3 rounded-xl px-4 py-3 text-slate-600 transition-all hover:bg-slate-100"
                                }
                                href={item.href}
                                key={item.href}
                            >
                                <span
                                    className="material-symbols-outlined text-[20px]"
                                    style={
                                        item.active
                                            ? {
                                                  fontVariationSettings:
                                                      "'FILL' 1, 'wght' 400, 'GRAD' 0, 'opsz' 24",
                                              }
                                            : undefined
                                    }
                                >
                                    {item.icon}
                                </span>
                                <span
                                    className={
                                        item.active
                                            ? "text-sm font-semibold"
                                            : "text-sm font-medium"
                                    }
                                >
                                    {item.label}
                                </span>
                            </Link>
                        ))}
                        <div className="mt-8 border-t border-slate-100 pt-8">
                            <button
                                className="flex w-full items-center gap-3 rounded-xl px-4 py-3 text-left text-red-500 transition-all hover:bg-red-50"
                                type="button"
                            >
                                <span className="material-symbols-outlined text-[20px]">
                                    logout
                                </span>
                                <span className="text-sm font-medium">
                                    Sair da conta
                                </span>
                            </button>
                        </div>
                    </nav>
                </aside>

                <section className="flex-grow">
                    <div className="rounded-3xl border border-slate-100 bg-white p-8 shadow-sm md:p-12">
                        <div className="mb-10 flex items-start justify-between gap-6">
                            <div>
                                <h2 className="text-2xl font-extrabold tracking-tight text-slate-900">
                                    Dados Pessoais
                                </h2>
                                <p className="mt-1 text-slate-500">
                                    Mantenha suas informações de contato
                                    atualizadas.
                                </p>
                            </div>
                            <div className="flex h-20 w-20 shrink-0 items-center justify-center overflow-hidden rounded-full border-4 border-slate-50 bg-slate-900 text-xl font-extrabold text-white shadow-inner">
                                {initials}
                            </div>
                        </div>

                        {profile.error ? (
                            <p className="mb-8 rounded-2xl bg-slate-50 px-5 py-4 text-sm font-semibold text-slate-600">
                                {profile.error}
                            </p>
                        ) : null}

                        <form className="space-y-8">
                            <div className="grid grid-cols-1 gap-8 md:grid-cols-2">
                                <div className="space-y-2">
                                    <label className="px-1 text-[11px] font-bold uppercase tracking-widest text-slate-400">
                                        Nome Completo
                                    </label>
                                    <input
                                        className="w-full rounded-2xl border-none bg-slate-50 px-5 py-4 font-medium text-slate-800 transition-all focus:ring-2 focus:ring-slate-900"
                                        defaultValue={user?.name ?? ""}
                                        placeholder={
                                            profile.isLoading
                                                ? "Carregando..."
                                                : "Seu nome"
                                        }
                                        type="text"
                                    />
                                </div>

                                <div className="space-y-2">
                                    <label className="px-1 text-[11px] font-bold uppercase tracking-widest text-slate-400">
                                        E-mail
                                    </label>
                                    <input
                                        className="w-full rounded-2xl border-none bg-slate-50 px-5 py-4 font-medium text-slate-800 transition-all focus:ring-2 focus:ring-slate-900"
                                        defaultValue={user?.email ?? ""}
                                        placeholder={
                                            profile.isLoading
                                                ? "Carregando..."
                                                : "seu@email.com"
                                        }
                                        type="email"
                                    />
                                </div>

                                <div className="space-y-2">
                                    <label className="px-1 text-[11px] font-bold uppercase tracking-widest text-slate-400">
                                        CPF
                                    </label>
                                    <input
                                        className="w-full rounded-2xl border-none bg-slate-50 px-5 py-4 font-medium text-slate-800 transition-all focus:ring-2 focus:ring-slate-900"
                                        defaultValue={user?.document ?? ""}
                                        placeholder="123.456.789-00"
                                        type="text"
                                    />
                                </div>

                                <div className="space-y-2">
                                    <label className="px-1 text-[11px] font-bold uppercase tracking-widest text-slate-400">
                                        Telefone
                                    </label>
                                    <input
                                        className="w-full rounded-2xl border-none bg-slate-50 px-5 py-4 font-medium text-slate-800 transition-all focus:ring-2 focus:ring-slate-900"
                                        placeholder="(11) 98765-4321"
                                        type="tel"
                                    />
                                </div>

                                <div className="space-y-2">
                                    <label className="px-1 text-[11px] font-bold uppercase tracking-widest text-slate-400">
                                        Data de Nascimento
                                    </label>
                                    <div className="relative">
                                        <input
                                            className="w-full rounded-2xl border-none bg-slate-50 px-5 py-4 font-medium text-slate-800 transition-all focus:ring-2 focus:ring-slate-900"
                                            placeholder="12/08/1988"
                                            type="text"
                                        />
                                        <span className="material-symbols-outlined absolute right-4 top-1/2 -translate-y-1/2 text-slate-400">
                                            calendar_today
                                        </span>
                                    </div>
                                </div>
                            </div>

                            <div className="mt-10 flex flex-col items-center gap-4 border-t border-slate-50 pt-6 sm:flex-row">
                                <button
                                    className="w-full rounded-2xl bg-slate-900 px-10 py-4 font-bold text-white shadow-lg shadow-slate-200 transition-all hover:bg-slate-800 sm:w-auto"
                                    type="submit"
                                >
                                    Salvar Alterações
                                </button>
                                <button
                                    className="w-full px-10 py-4 font-bold text-slate-500 transition-all hover:text-slate-900 sm:w-auto"
                                    type="button"
                                >
                                    Cancelar
                                </button>
                            </div>
                        </form>
                    </div>
                </section>
            </div>
        </main>
    );
}
