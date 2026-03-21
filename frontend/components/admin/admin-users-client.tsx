"use client";

import { FormEvent, useState } from "react";
import { useAdminUsers } from "@/hooks/use-admin-users";
import { User, UserRole } from "@/lib/types";
import { getInitials } from "@/lib/utils";

type AdminUsersClientProps = {
    initialUser: User | null;
};

export function AdminUsersClient({ initialUser }: AdminUsersClientProps) {
    const users = useAdminUsers(initialUser);
    const [formState, setFormState] = useState({
        name: "",
        email: "",
        document: "",
        password: "",
        role: "SUBADMIN" as UserRole,
    });
    const [statusMessage, setStatusMessage] = useState<string | null>(null);

    async function handleCreate(event: FormEvent<HTMLFormElement>) {
        event.preventDefault();
        setStatusMessage(null);

        try {
            await users.createUser(formState);
            setStatusMessage("Usuário criado com sucesso.");
            setFormState({
                name: "",
                email: "",
                document: "",
                password: "",
                role: "SUBADMIN",
            });
        } catch (reason) {
            setStatusMessage(
                reason instanceof Error ? reason.message : "Falha ao criar.",
            );
        }
    }

    return (
        <div className="flex min-h-full flex-col overflow-hidden font-sans text-slate-900">
            <header className="flex h-16 items-center justify-between border-b border-slate-200 bg-white px-8">
                <div className="flex items-center gap-2 text-slate-500">
                    <span className="text-sm">Painel de Controle</span>
                    <span className="material-symbols-outlined text-sm">
                        chevron_right
                    </span>
                    <span className="text-sm font-bold text-slate-900">
                        Administradores
                    </span>
                </div>
                <div className="flex items-center gap-4">
                    <button className="relative rounded-full p-2 text-slate-500 hover:bg-slate-100">
                        <span className="material-symbols-outlined">
                            notifications
                        </span>
                        <span className="absolute right-2 top-2 size-2 rounded-full bg-red-500" />
                    </button>
                    <button className="rounded-full p-2 text-slate-500 hover:bg-slate-100">
                        <span className="material-symbols-outlined">
                            search
                        </span>
                    </button>
                </div>
            </header>

            <div className="p-8">
                <div className="mx-auto max-w-6xl">
                    <div className="mb-8 flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
                        <div>
                            <h1 className="font-display text-3xl font-bold text-slate-900">
                                Gestão de Administradores
                            </h1>
                            <p className="mt-1 text-sm text-slate-500">
                                Visualize e gerencie as permissões e acessos da
                                sua equipe interna.
                            </p>
                        </div>
                        <button className="flex items-center justify-center gap-2 rounded-lg bg-primary px-5 py-2.5 text-sm font-bold text-white shadow-sm transition hover:bg-primary/90">
                            <span className="material-symbols-outlined text-xl">
                                person_add
                            </span>
                            <span>Convidar Novo Administrador</span>
                        </button>
                    </div>

                    <div className="mb-6 flex flex-col gap-4 sm:flex-row">
                        <div className="relative flex-1">
                            <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-slate-400">
                                search
                            </span>
                            <input
                                className="w-full rounded-lg border border-slate-200 bg-white py-2.5 pl-10 pr-4 text-sm"
                                placeholder="Pesquisar por nome, cargo ou e-mail..."
                            />
                        </div>
                        <button className="flex items-center justify-center gap-2 rounded-lg border border-slate-200 bg-white px-4 py-2.5 text-sm font-medium">
                            <span className="material-symbols-outlined">
                                filter_list
                            </span>
                            <span>Filtros</span>
                        </button>
                    </div>

                    <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
                        <div className="overflow-x-auto">
                            <table className="w-full border-collapse text-left">
                                <thead>
                                    <tr className="border-b border-slate-200 bg-slate-50">
                                        <th className="px-6 py-4 text-xs font-bold uppercase tracking-wider text-slate-500">
                                            Nome do Usuário
                                        </th>
                                        <th className="px-6 py-4 text-xs font-bold uppercase tracking-wider text-slate-500">
                                            Cargo / Função
                                        </th>
                                        <th className="px-6 py-4 text-xs font-bold uppercase tracking-wider text-slate-500">
                                            E-mail
                                        </th>
                                        <th className="px-6 py-4 text-xs font-bold uppercase tracking-wider text-slate-500">
                                            Status
                                        </th>
                                        <th className="px-6 py-4 text-right text-xs font-bold uppercase tracking-wider text-slate-500">
                                            Ações
                                        </th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-200">
                                    {users.data.map((user) => (
                                        <tr
                                            key={user.uuid}
                                            className="transition-colors hover:bg-slate-50"
                                        >
                                            <td className="px-6 py-4">
                                                <div className="flex items-center gap-3">
                                                    <div className="flex size-9 items-center justify-center rounded-full bg-primary/10 text-sm font-bold text-primary">
                                                        {getInitials(user.name)}
                                                    </div>
                                                    <span className="text-sm font-medium text-slate-900">
                                                        {user.name}
                                                    </span>
                                                </div>
                                            </td>
                                            <td className="px-6 py-4">
                                                <span className="inline-flex rounded-full bg-primary/10 px-2.5 py-0.5 text-xs font-medium text-primary">
                                                    {user.role}
                                                </span>
                                            </td>
                                            <td className="px-6 py-4 text-sm text-slate-500">
                                                {user.email}
                                            </td>
                                            <td className="px-6 py-4">
                                                <span
                                                    className={`flex items-center gap-1.5 text-xs font-bold ${
                                                        user.isActive
                                                            ? "text-emerald-600"
                                                            : "text-slate-400"
                                                    }`}
                                                >
                                                    <span
                                                        className={`size-1.5 rounded-full ${
                                                            user.isActive
                                                                ? "bg-emerald-500"
                                                                : "bg-slate-400"
                                                        }`}
                                                    />
                                                    {user.isActive
                                                        ? "Ativo"
                                                        : "Pendente"}
                                                </span>
                                            </td>
                                            <td className="px-6 py-4 text-right">
                                                <button className="text-slate-400 transition-colors hover:text-primary">
                                                    <span className="material-symbols-outlined">
                                                        more_vert
                                                    </span>
                                                </button>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </div>

                    <div className="mt-8 grid gap-8 lg:grid-cols-[1.15fr_0.85fr]">
                        <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
                            <h3 className="font-display text-2xl font-bold text-slate-900">
                                Convidar Novo Administrador
                            </h3>
                            <form
                                className="mt-6 space-y-4"
                                onSubmit={handleCreate}
                            >
                                <input
                                    className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2.5"
                                    onChange={(event) =>
                                        setFormState((current) => ({
                                            ...current,
                                            name: event.target.value,
                                        }))
                                    }
                                    placeholder="Nome"
                                    value={formState.name}
                                />
                                <input
                                    className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2.5"
                                    onChange={(event) =>
                                        setFormState((current) => ({
                                            ...current,
                                            email: event.target.value,
                                        }))
                                    }
                                    placeholder="E-mail"
                                    value={formState.email}
                                />
                                <input
                                    className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2.5"
                                    onChange={(event) =>
                                        setFormState((current) => ({
                                            ...current,
                                            document: event.target.value,
                                        }))
                                    }
                                    placeholder="Documento"
                                    value={formState.document}
                                />
                                <input
                                    className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2.5"
                                    onChange={(event) =>
                                        setFormState((current) => ({
                                            ...current,
                                            password: event.target.value,
                                        }))
                                    }
                                    placeholder="Senha temporária"
                                    type="password"
                                    value={formState.password}
                                />
                                <select
                                    className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2.5"
                                    onChange={(event) =>
                                        setFormState((current) => ({
                                            ...current,
                                            role: event.target
                                                .value as UserRole,
                                        }))
                                    }
                                    value={formState.role}
                                >
                                    <option value="SUBADMIN">SUBADMIN</option>
                                    <option value="USER">USER</option>
                                    <option value="ADMIN">ADMIN</option>
                                </select>
                                <button
                                    className="w-full rounded-lg bg-primary py-3 font-bold text-white"
                                    type="submit"
                                >
                                    Criar via POST /users
                                </button>
                                {statusMessage ? (
                                    <p className="text-sm text-slate-600">
                                        {statusMessage}
                                    </p>
                                ) : null}
                            </form>
                        </div>

                        <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
                            <h3 className="font-display text-2xl font-bold text-slate-900">
                                Estado do contrato
                            </h3>
                            <p className="mt-4 text-sm leading-7 text-slate-600">
                                O frontend mantém o visual da listagem do
                                Stitch, mas a API atual ainda não documenta um
                                `GET /users` completo para administração. Por
                                isso, a criação segue funcional e a tabela usa o
                                contexto disponível.
                            </p>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
