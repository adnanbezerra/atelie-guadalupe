"use client";

import { FormEvent, useState } from "react";
import { FeedbackDialog } from "@/components/shared/feedback-dialog";
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
} from "@/components/ui/dialog";
import { useAdminUsers } from "@/hooks/use-admin-users";
import type { User, UserRole, UsersPayload } from "@/lib/types";
import { getInitials } from "@/lib/utils";

type Props = {
    initialError: { message: string; status: number | null } | null;
    initialData: UsersPayload;
};
type ManagedRole = "ADMIN" | "SUBADMIN" | "USER";
type AccessAction =
    | { kind: "role"; role: ManagedRole; user: User }
    | { kind: "status"; isActive: boolean; user: User };

const roleDetails: Record<ManagedRole, { label: string; description: string }> =
    {
        USER: {
            label: "Cliente",
            description: "Compra e gerencia somente a própria conta.",
        },
        SUBADMIN: {
            label: "Equipe",
            description: "Opera produtos e pedidos, sem gerenciar acessos.",
        },
        ADMIN: {
            label: "Administrador",
            description:
                "Acesso total, inclusive criação e revogação de usuários.",
        },
    };

function isManagedRole(role: UserRole): role is ManagedRole {
    return role === "ADMIN" || role === "SUBADMIN" || role === "USER";
}

export function AdminUsersClient({ initialData, initialError }: Props) {
    const [isCreateOpen, setIsCreateOpen] = useState(false);
    const [isCreating, setIsCreating] = useState(false);
    const [search, setSearch] = useState("");
    const [page, setPage] = useState(1);
    const [group, setGroup] = useState<"TEAM" | "CUSTOMERS">("TEAM");
    const [status, setStatus] = useState<"ALL" | "ACTIVE" | "INACTIVE">("ALL");
    const [role, setRole] = useState<ManagedRole>("SUBADMIN");
    const [pendingAction, setPendingAction] = useState<AccessAction | null>(
        null,
    );
    const [isUpdating, setIsUpdating] = useState(false);
    const [dismissedLoadError, setDismissedLoadError] = useState(false);
    const [ignoredInitialError, setIgnoredInitialError] = useState(false);
    const [feedback, setFeedback] = useState<{
        title: string;
        description: string;
    } | null>(null);
    const [form, setForm] = useState({
        name: "",
        email: "",
        document: "",
        password: "",
        role: "SUBADMIN" as "ADMIN" | "SUBADMIN",
    });
    const users = useAdminUsers(initialData, {
        page,
        pageSize: 20,
        search: search.trim() || undefined,
        role: group === "CUSTOMERS" ? "USER" : role,
        isActive: status === "ALL" ? undefined : status === "ACTIVE",
    });
    const filteredUsers = users.data.users;
    const pagination = users.data.pagination;

    async function handleCreate(event: FormEvent<HTMLFormElement>) {
        event.preventDefault();
        const document = form.document.replace(/\D/g, "");
        if (!form.name.trim() || !form.email.trim()) {
            setFeedback({
                title: "Confira os dados",
                description: "Informe nome e e-mail para criar o acesso.",
            });
            return;
        }
        if (document.length !== 11 && document.length !== 14) {
            setFeedback({
                title: "Confira o CPF ou CNPJ",
                description: "O documento deve conter 11 ou 14 dígitos.",
            });
            return;
        }
        if (
            form.password.length < 8 ||
            form.password.length > 72 ||
            !/[a-z]/.test(form.password) ||
            !/[A-Z]/.test(form.password) ||
            !/\d/.test(form.password) ||
            !/[^A-Za-z0-9]/.test(form.password)
        ) {
            setFeedback({
                title: "Confira a senha inicial",
                description:
                    "Use de 8 a 72 caracteres, com maiúscula, minúscula, número e símbolo.",
            });
            return;
        }

        setIsCreating(true);
        try {
            await users.createUser({
                ...form,
                name: form.name.trim(),
                email: form.email.trim(),
                document,
            });
            setForm({
                name: "",
                email: "",
                document: "",
                password: "",
                role: "SUBADMIN",
            });
            setIsCreateOpen(false);
            setFeedback({
                title: "Acesso criado",
                description:
                    "A conta foi criada. A API ainda não oferece convite ou troca obrigatória de senha; compartilhe a senha inicial por um canal seguro.",
            });
        } catch (error) {
            setFeedback({
                title: "Não foi possível criar o acesso",
                description:
                    error instanceof Error
                        ? error.message
                        : "Tente novamente em alguns instantes.",
            });
        } finally {
            setIsCreating(false);
        }
    }

    async function confirmAccessAction() {
        if (!pendingAction) return;
        setIsUpdating(true);
        try {
            await users.updateUser(
                pendingAction.user.uuid,
                pendingAction.kind === "role"
                    ? { role: pendingAction.role }
                    : { isActive: pendingAction.isActive },
            );
            setFeedback({
                title: "Acesso atualizado",
                description:
                    pendingAction.kind === "role"
                        ? `${pendingAction.user.name} agora tem o papel ${roleDetails[pendingAction.role].label}.`
                        : pendingAction.isActive
                          ? `O acesso de ${pendingAction.user.name} foi restaurado.`
                          : `O acesso de ${pendingAction.user.name} foi revogado.`,
            });
            setPendingAction(null);
        } catch (error) {
            setFeedback({
                title: "Não foi possível atualizar o acesso",
                description:
                    error instanceof Error
                        ? error.message
                        : "Tente novamente em alguns instantes.",
            });
        } finally {
            setIsUpdating(false);
        }
    }

    const loadError =
        !dismissedLoadError &&
        (users.error || (!ignoredInitialError && initialError?.message));

    return (
        <div className="min-h-full bg-[#f6f6f8] text-slate-900">
            <div className="mx-auto w-full max-w-7xl px-5 py-8 md:px-8 md:py-10">
                <div className="flex flex-col gap-5 md:flex-row md:items-start md:justify-between">
                    <div className="max-w-2xl">
                        <h1 className="font-display text-3xl font-bold text-slate-950">
                            Gestão de acessos
                        </h1>
                        <p className="mt-2 text-sm leading-6 text-slate-600 md:text-base">
                            Clientes cuidam da própria conta. Equipe opera a
                            loja; administrador também controla acessos. Use
                            sempre o menor privilégio necessário.
                        </p>
                    </div>
                    <Dialog
                        open={isCreateOpen}
                        onOpenChange={(open) =>
                            !isCreating && setIsCreateOpen(open)
                        }
                    >
                        <DialogTrigger asChild>
                            <button className="flex min-h-11 items-center justify-center gap-2 rounded-lg bg-primary px-5 py-2.5 text-sm font-bold text-white">
                                <span
                                    aria-hidden="true"
                                    className="material-symbols-outlined"
                                >
                                    person_add
                                </span>
                                Criar acesso da equipe
                            </button>
                        </DialogTrigger>
                        <DialogContent className="max-h-[90vh] max-w-lg overflow-y-auto rounded-xl bg-white p-0">
                            <DialogHeader className="border-b border-slate-200 p-6">
                                <DialogTitle className="font-display text-2xl font-bold text-slate-950">
                                    Criar acesso da equipe
                                </DialogTitle>
                                <DialogDescription className="leading-6 text-slate-600">
                                    Não existe convite no contrato atual. Esta
                                    ação cria a conta imediatamente com uma
                                    senha inicial.
                                </DialogDescription>
                            </DialogHeader>
                            <form
                                className="space-y-4 p-6"
                                onSubmit={handleCreate}
                            >
                                <Field label="Nome">
                                    <input
                                        autoComplete="name"
                                        className="h-12 w-full rounded-lg border border-slate-300 px-3 text-base"
                                        onChange={(event) =>
                                            setForm((current) => ({
                                                ...current,
                                                name: event.target.value,
                                            }))
                                        }
                                        value={form.name}
                                    />
                                </Field>
                                <Field label="E-mail">
                                    <input
                                        autoComplete="email"
                                        className="h-12 w-full rounded-lg border border-slate-300 px-3 text-base"
                                        onChange={(event) =>
                                            setForm((current) => ({
                                                ...current,
                                                email: event.target.value,
                                            }))
                                        }
                                        type="email"
                                        value={form.email}
                                    />
                                </Field>
                                <Field label="CPF ou CNPJ">
                                    <input
                                        className="h-12 w-full rounded-lg border border-slate-300 px-3 text-base"
                                        inputMode="numeric"
                                        maxLength={18}
                                        onChange={(event) =>
                                            setForm((current) => ({
                                                ...current,
                                                document: event.target.value,
                                            }))
                                        }
                                        value={form.document}
                                    />
                                </Field>
                                <Field label="Senha inicial">
                                    <input
                                        autoComplete="new-password"
                                        className="h-12 w-full rounded-lg border border-slate-300 px-3 text-base"
                                        onChange={(event) =>
                                            setForm((current) => ({
                                                ...current,
                                                password: event.target.value,
                                            }))
                                        }
                                        type="password"
                                        value={form.password}
                                    />
                                    <p className="mt-1.5 text-xs leading-5 text-slate-600">
                                        8–72 caracteres, com maiúscula,
                                        minúscula, número e símbolo. Compartilhe
                                        por canal seguro.
                                    </p>
                                </Field>
                                <Field label="Papel">
                                    <select
                                        className="h-12 w-full rounded-lg border border-slate-300 bg-white px-3 text-base"
                                        onChange={(event) =>
                                            setForm((current) => ({
                                                ...current,
                                                role: event.target.value as
                                                    | "ADMIN"
                                                    | "SUBADMIN",
                                            }))
                                        }
                                        value={form.role}
                                    >
                                        <option value="SUBADMIN">Equipe</option>
                                        <option value="ADMIN">
                                            Administrador
                                        </option>
                                    </select>
                                    <p className="mt-1.5 text-xs leading-5 text-slate-600">
                                        Equipe é a opção recomendada.
                                        Administrador também pode criar, alterar
                                        e revogar acessos.
                                    </p>
                                </Field>
                                <button
                                    className="min-h-12 w-full rounded-lg bg-primary px-4 py-3 font-bold text-white disabled:opacity-60"
                                    disabled={isCreating}
                                    type="submit"
                                >
                                    {isCreating
                                        ? "Criando acesso..."
                                        : "Criar acesso"}
                                </button>
                            </form>
                        </DialogContent>
                    </Dialog>
                </div>

                <div className="mt-8 flex flex-wrap gap-2" role="tablist">
                    <GroupButton
                        active={group === "TEAM"}
                        label="Equipe"
                        onClick={() => {
                            setGroup("TEAM");
                            setRole("SUBADMIN");
                            setPage(1);
                        }}
                    />
                    <GroupButton
                        active={group === "CUSTOMERS"}
                        label="Clientes"
                        onClick={() => {
                            setGroup("CUSTOMERS");
                            setRole("USER");
                            setPage(1);
                        }}
                    />
                </div>

                <section className="mt-4 overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
                    <div className="grid gap-3 border-b border-slate-200 p-4 md:grid-cols-[minmax(0,1fr)_12rem_12rem]">
                        <label className="relative">
                            <span className="sr-only">
                                Pesquisar nesta lista
                            </span>
                            <span
                                aria-hidden="true"
                                className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"
                            >
                                search
                            </span>
                            <input
                                className="h-11 w-full rounded-lg border border-slate-300 pl-10 pr-3 text-base"
                                onChange={(event) => {
                                    setSearch(event.target.value);
                                    setPage(1);
                                }}
                                placeholder="Nome, e-mail ou documento"
                                value={search}
                            />
                        </label>
                        <select
                            aria-label="Filtrar por papel"
                            className="h-11 rounded-lg border border-slate-300 bg-white px-3 text-sm"
                            disabled={group === "CUSTOMERS"}
                            onChange={(event) =>
                                setRole(event.target.value as ManagedRole)
                            }
                            value={role}
                        >
                            {group === "TEAM" ? (
                                <>
                                    <option value="SUBADMIN">Equipe</option>
                                    <option value="ADMIN">Administrador</option>
                                </>
                            ) : (
                                <option value="USER">Cliente</option>
                            )}
                        </select>
                        <select
                            aria-label="Filtrar por status"
                            className="h-11 rounded-lg border border-slate-300 bg-white px-3 text-sm"
                            onChange={(event) => {
                                setStatus(
                                    event.target.value as
                                        | "ALL"
                                        | "ACTIVE"
                                        | "INACTIVE",
                                );
                                setPage(1);
                            }}
                            value={status}
                        >
                            <option value="ALL">Todos os status</option>
                            <option value="ACTIVE">Acesso ativo</option>
                            <option value="INACTIVE">Acesso revogado</option>
                        </select>
                        <p className="text-xs leading-5 text-slate-500 md:col-span-3">
                            Busca, papel e status são aplicados no servidor.
                        </p>
                    </div>

                    {users.data.users.length === 0 && !loadError ? (
                        <EmptyState
                            description={
                                group === "TEAM"
                                    ? "Nenhum acesso de equipe foi cadastrado."
                                    : "Nenhum cliente foi cadastrado."
                            }
                            title={
                                group === "TEAM"
                                    ? "Equipe vazia"
                                    : "Nenhum cliente"
                            }
                        />
                    ) : filteredUsers.length === 0 ? (
                        <EmptyState
                            description="Ajuste a busca ou os filtros para ver outros resultados."
                            title="Nenhum resultado"
                        />
                    ) : (
                        <div className="overflow-x-auto">
                            <table className="w-full min-w-[860px] text-left">
                                <thead className="bg-slate-50 text-xs font-bold uppercase tracking-wider text-slate-600">
                                    <tr>
                                        <th className="px-6 py-4">Pessoa</th>
                                        <th className="px-6 py-4">Documento</th>
                                        <th className="px-6 py-4">Papel</th>
                                        <th className="px-6 py-4">Status</th>
                                        <th className="px-6 py-4 text-right">
                                            Acesso
                                        </th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-200">
                                    {filteredUsers.map((user) => {
                                        const userRole = isManagedRole(
                                            user.role,
                                        )
                                            ? user.role
                                            : "USER";
                                        return (
                                            <tr key={user.uuid}>
                                                <td className="max-w-xs px-6 py-4">
                                                    <div className="flex min-w-0 items-center gap-3">
                                                        <div className="flex size-9 shrink-0 items-center justify-center rounded-full bg-primary/10 text-sm font-bold text-primary">
                                                            {getInitials(
                                                                user.name,
                                                            )}
                                                        </div>
                                                        <div className="min-w-0">
                                                            <p className="truncate font-semibold text-slate-950">
                                                                {user.name}
                                                            </p>
                                                            <p className="truncate text-sm text-slate-600">
                                                                {user.email}
                                                            </p>
                                                        </div>
                                                    </div>
                                                </td>
                                                <td className="px-6 py-4 text-sm text-slate-700">
                                                    {user.document}
                                                </td>
                                                <td className="px-6 py-4">
                                                    <select
                                                        aria-label={`Alterar papel de ${user.name}`}
                                                        className="h-10 rounded-lg border border-slate-300 bg-white px-3 text-sm"
                                                        onChange={(event) =>
                                                            setPendingAction({
                                                                kind: "role",
                                                                role: event
                                                                    .target
                                                                    .value as ManagedRole,
                                                                user,
                                                            })
                                                        }
                                                        value={userRole}
                                                    >
                                                        <option value="USER">
                                                            Cliente
                                                        </option>
                                                        <option value="SUBADMIN">
                                                            Equipe
                                                        </option>
                                                        <option value="ADMIN">
                                                            Administrador
                                                        </option>
                                                    </select>
                                                </td>
                                                <td className="px-6 py-4 text-sm font-semibold">
                                                    {user.isActive ? (
                                                        <span className="text-emerald-700">
                                                            Acesso ativo
                                                        </span>
                                                    ) : (
                                                        <span className="text-slate-500">
                                                            Acesso revogado
                                                        </span>
                                                    )}
                                                </td>
                                                <td className="px-6 py-4 text-right">
                                                    <button
                                                        className={
                                                            user.isActive
                                                                ? "rounded-lg border border-red-200 px-3 py-2 text-sm font-bold text-red-700 hover:bg-red-50"
                                                                : "rounded-lg border border-slate-300 px-3 py-2 text-sm font-bold text-slate-700 hover:bg-slate-50"
                                                        }
                                                        onClick={() =>
                                                            setPendingAction({
                                                                kind: "status",
                                                                isActive:
                                                                    !user.isActive,
                                                                user,
                                                            })
                                                        }
                                                        type="button"
                                                    >
                                                        {user.isActive
                                                            ? "Revogar acesso"
                                                            : "Restaurar acesso"}
                                                    </button>
                                                </td>
                                            </tr>
                                        );
                                    })}
                                </tbody>
                            </table>
                        </div>
                    )}
                    {pagination.totalPages > 1 ? (
                        <div className="flex items-center justify-between border-t border-slate-200 px-6 py-4">
                            <p className="text-sm text-slate-600">
                                Página {pagination.page} de{" "}
                                {pagination.totalPages} · {pagination.total}{" "}
                                usuários
                            </p>
                            <div className="flex gap-2">
                                <button
                                    className="min-h-11 rounded-lg border border-slate-300 px-4 text-sm font-bold disabled:opacity-50"
                                    disabled={users.isLoading || page <= 1}
                                    onClick={() =>
                                        setPage((current) =>
                                            Math.max(1, current - 1),
                                        )
                                    }
                                    type="button"
                                >
                                    Anterior
                                </button>
                                <button
                                    className="min-h-11 rounded-lg border border-slate-300 px-4 text-sm font-bold disabled:opacity-50"
                                    disabled={
                                        users.isLoading ||
                                        page >= pagination.totalPages
                                    }
                                    onClick={() =>
                                        setPage((current) => current + 1)
                                    }
                                    type="button"
                                >
                                    Próxima
                                </button>
                            </div>
                        </div>
                    ) : null}
                </section>
            </div>

            <FeedbackDialog
                confirmLabel={
                    isUpdating ? "Atualizando..." : "Confirmar alteração"
                }
                description={
                    pendingAction?.kind === "role"
                        ? `${pendingAction.user.name} passará a ter o papel ${roleDetails[pendingAction.role].label}. ${roleDetails[pendingAction.role].description}`
                        : pendingAction
                          ? `${pendingAction.isActive ? "Restaurar" : "Revogar"} o acesso de ${pendingAction.user.name}? ${pendingAction.isActive ? "A pessoa poderá entrar novamente." : "A pessoa deixará de acessar o sistema."}`
                          : ""
                }
                onConfirm={() => void confirmAccessAction()}
                onOpenChange={(open) => {
                    if (!open && !isUpdating) setPendingAction(null);
                }}
                open={pendingAction != null}
                secondaryLabel="Cancelar"
                title={
                    pendingAction?.kind === "role"
                        ? "Confirmar novo papel"
                        : "Confirmar mudança de acesso"
                }
            />
            <FeedbackDialog
                confirmLabel={loadError ? "Tentar novamente" : "Entendi"}
                description={
                    feedback?.description ??
                    users.error ??
                    initialError?.message ??
                    ""
                }
                onConfirm={
                    loadError
                        ? () => {
                              setDismissedLoadError(true);
                              setIgnoredInitialError(true);
                              void users
                                  .refresh()
                                  .then(() => setDismissedLoadError(false));
                          }
                        : undefined
                }
                onOpenChange={(open) => {
                    if (!open) {
                        setFeedback(null);
                        setDismissedLoadError(true);
                    }
                }}
                open={Boolean(feedback || loadError)}
                title={
                    feedback?.title ??
                    ((!ignoredInitialError && initialError?.status === 403) ||
                    users.error?.includes("não permite")
                        ? "Acesso não autorizado"
                        : "Não foi possível carregar os usuários")
                }
            />
        </div>
    );
}

function Field({
    children,
    label,
}: {
    children: React.ReactNode;
    label: string;
}) {
    return (
        <label className="block">
            <span className="mb-1.5 block text-sm font-bold text-slate-800">
                {label}
            </span>
            {children}
        </label>
    );
}

function GroupButton({
    active,
    label,
    onClick,
}: {
    active: boolean;
    label: string;
    onClick: () => void;
}) {
    return (
        <button
            aria-selected={active}
            className={
                active
                    ? "rounded-lg bg-primary px-4 py-2.5 text-sm font-bold text-white"
                    : "rounded-lg border border-slate-300 bg-white px-4 py-2.5 text-sm font-bold text-slate-700"
            }
            onClick={onClick}
            role="tab"
            type="button"
        >
            {label}
        </button>
    );
}

function EmptyState({
    description,
    title,
}: {
    description: string;
    title: string;
}) {
    return (
        <div className="px-6 py-14 text-center">
            <svg
                aria-hidden="true"
                className="mx-auto size-10 text-slate-300"
                fill="none"
                viewBox="0 0 24 24"
            >
                <path
                    d="M16 21v-2a4 4 0 0 0-4-4H7a4 4 0 0 0-4 4v2"
                    stroke="currentColor"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth="2"
                />
                <circle
                    cx="9.5"
                    cy="7"
                    r="4"
                    stroke="currentColor"
                    strokeWidth="2"
                />
                <path
                    d="M17 11a4 4 0 0 1 4 4v2M3 3l18 18"
                    stroke="currentColor"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth="2"
                />
            </svg>
            <h2 className="mt-3 font-bold text-slate-950">{title}</h2>
            <p className="mt-1 text-sm text-slate-600">{description}</p>
        </div>
    );
}
