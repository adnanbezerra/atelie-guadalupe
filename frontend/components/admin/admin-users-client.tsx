"use client";

import { FormEvent, useState } from "react";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
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
    const [manualUuid, setManualUuid] = useState(initialUser?.uuid ?? "");
    const [statusMessage, setStatusMessage] = useState<string | null>(null);

    async function handleCreate(event: FormEvent<HTMLFormElement>) {
        event.preventDefault();
        setStatusMessage(null);

        try {
            const result = await users.createUser(formState);
            setStatusMessage(`Usuario criado: ${result.user.name}`);
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

    async function deactivateUser() {
        setStatusMessage(null);

        try {
            await users.updateUser(manualUuid, { isActive: false });
            setStatusMessage("Usuario atualizado com sucesso.");
        } catch (reason) {
            setStatusMessage(
                reason instanceof Error
                    ? reason.message
                    : "Falha ao atualizar.",
            );
        }
    }

    return (
        <div className="space-y-8">
            <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
                <div>
                    <p className="text-sm uppercase tracking-[0.35em] text-primary/70">
                        Administradores
                    </p>
                    <h2 className="mt-2 font-display text-4xl font-bold text-slate-900">
                        Gestao de Usuarios
                    </h2>
                    <p className="mt-3 max-w-3xl text-sm leading-7 text-slate-600">
                        O contrato atual documenta `POST /users`, `PATCH
                        /users/:uuid` e o proprio `GET /users/me`, mas ainda nao
                        traz a listagem administrativa completa. A tela deixa
                        esse gap explicito e continua util para cadastro e
                        manutencao manual.
                    </p>
                </div>
            </div>

            <div className="grid gap-6 xl:grid-cols-[1.2fr_0.8fr]">
                <Card className="overflow-hidden">
                    <div className="border-b border-slate-200 px-6 py-5">
                        <h3 className="font-display text-2xl font-bold text-slate-900">
                            Quadro atual
                        </h3>
                    </div>
                    <div className="overflow-x-auto">
                        <table className="min-w-full text-left">
                            <thead className="bg-slate-50 text-xs font-semibold uppercase tracking-[0.22em] text-slate-500">
                                <tr>
                                    <th className="px-6 py-4">
                                        Nome do Usuario
                                    </th>
                                    <th className="px-6 py-4">Cargo</th>
                                    <th className="px-6 py-4">E-mail</th>
                                    <th className="px-6 py-4">Status</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100 bg-white">
                                {users.data.map((user) => (
                                    <tr key={user.uuid}>
                                        <td className="px-6 py-4">
                                            <div className="flex items-center gap-3">
                                                <div className="flex size-10 items-center justify-center rounded-2xl bg-primary/10 font-semibold text-primary">
                                                    {getInitials(user.name)}
                                                </div>
                                                <div>
                                                    <p className="font-semibold text-slate-900">
                                                        {user.name}
                                                    </p>
                                                    <p className="text-xs text-slate-500">
                                                        {user.uuid}
                                                    </p>
                                                </div>
                                            </div>
                                        </td>
                                        <td className="px-6 py-4 text-sm font-semibold text-slate-700">
                                            {user.role}
                                        </td>
                                        <td className="px-6 py-4 text-sm text-slate-600">
                                            {user.email}
                                        </td>
                                        <td className="px-6 py-4">
                                            <span
                                                className={`rounded-full px-3 py-1 text-xs font-semibold uppercase tracking-[0.2em] ${
                                                    user.isActive
                                                        ? "bg-emerald-100 text-emerald-700"
                                                        : "bg-slate-100 text-slate-600"
                                                }`}
                                            >
                                                {user.isActive
                                                    ? "Ativo"
                                                    : "Inativo"}
                                            </span>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </Card>

                <div className="space-y-6">
                    <Card className="p-6">
                        <h3 className="font-display text-2xl font-bold text-slate-900">
                            Convidar Novo Administrador
                        </h3>
                        <form
                            className="mt-6 space-y-4"
                            onSubmit={handleCreate}
                        >
                            <Input
                                onChange={(event) =>
                                    setFormState((current) => ({
                                        ...current,
                                        name: event.target.value,
                                    }))
                                }
                                placeholder="Nome"
                                value={formState.name}
                            />
                            <Input
                                onChange={(event) =>
                                    setFormState((current) => ({
                                        ...current,
                                        email: event.target.value,
                                    }))
                                }
                                placeholder="E-mail"
                                value={formState.email}
                            />
                            <Input
                                onChange={(event) =>
                                    setFormState((current) => ({
                                        ...current,
                                        document: event.target.value,
                                    }))
                                }
                                placeholder="Documento"
                                value={formState.document}
                            />
                            <Input
                                onChange={(event) =>
                                    setFormState((current) => ({
                                        ...current,
                                        password: event.target.value,
                                    }))
                                }
                                placeholder="Senha temporaria"
                                type="password"
                                value={formState.password}
                            />
                            <select
                                className="h-11 w-full rounded-2xl border border-slate-200 bg-white px-4 text-sm shadow-sm outline-none"
                                onChange={(event) =>
                                    setFormState((current) => ({
                                        ...current,
                                        role: event.target.value as UserRole,
                                    }))
                                }
                                value={formState.role}
                            >
                                <option value="SUBADMIN">SUBADMIN</option>
                                <option value="USER">USER</option>
                                <option value="ADMIN">ADMIN</option>
                            </select>
                            <Button className="w-full" type="submit">
                                Criar via POST /users
                            </Button>
                        </form>
                    </Card>

                    <Card className="p-6">
                        <h3 className="font-display text-2xl font-bold text-slate-900">
                            Atualizacao manual
                        </h3>
                        <div className="mt-6 space-y-4">
                            <Input
                                onChange={(event) =>
                                    setManualUuid(event.target.value)
                                }
                                placeholder="UUID do usuario"
                                value={manualUuid}
                            />
                            <Button
                                className="w-full"
                                onClick={deactivateUser}
                                type="button"
                                variant="outline"
                            >
                                Desativar via PATCH /users/:uuid
                            </Button>
                            {statusMessage ? (
                                <p className="text-sm text-slate-600">
                                    {statusMessage}
                                </p>
                            ) : null}
                        </div>
                    </Card>
                </div>
            </div>
        </div>
    );
}
