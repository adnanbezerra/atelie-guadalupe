"use client";

import { useState } from "react";
import { EmptyState } from "@/components/shared/empty-state";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { formatDate } from "@/lib/format";
import type { User } from "@/lib/types";

export function AdminUsersPage({ currentUser }: { currentUser: User | null }) {
    const [feedback, setFeedback] = useState<string | null>(null);

    return (
        <div className="space-y-8">
            <div>
                <p className="text-xs font-semibold uppercase tracking-[0.24em] text-primary">
                    Usuários
                </p>
                <h1 className="mt-3 font-display text-5xl font-bold">
                    Gestão de usuários
                </h1>
            </div>

            <div className="grid gap-8 xl:grid-cols-[0.75fr_1.25fr]">
                <Card className="p-6">
                    <h2 className="font-display text-2xl font-bold">
                        Criar usuário administrativo
                    </h2>
                    <p className="mt-3 text-sm leading-7 text-muted-foreground">
                        O contrato atual oferece `POST /users` e `PATCH
                        /users/:uuid`, mas não documenta um `GET /users` para
                        listagem completa.
                    </p>
                    <AdminUserCreateForm onFeedback={setFeedback} />
                    {feedback ? (
                        <p className="mt-4 text-sm text-muted-foreground">
                            {feedback}
                        </p>
                    ) : null}
                </Card>

                <div className="space-y-6">
                    {currentUser ? (
                        <Card className="p-6">
                            <div className="flex items-center justify-between gap-4">
                                <div>
                                    <h2 className="font-display text-2xl font-bold">
                                        {currentUser.name}
                                    </h2>
                                    <p className="mt-2 text-sm text-muted-foreground">
                                        {currentUser.email}
                                    </p>
                                </div>
                                <Badge>{currentUser.role}</Badge>
                            </div>
                            <div className="mt-6 grid gap-4 md:grid-cols-2">
                                <div>
                                    <p className="text-xs uppercase tracking-[0.22em] text-muted-foreground">
                                        Documento
                                    </p>
                                    <p className="mt-2 text-sm font-semibold">
                                        {currentUser.document}
                                    </p>
                                </div>
                                <div>
                                    <p className="text-xs uppercase tracking-[0.22em] text-muted-foreground">
                                        Criado em
                                    </p>
                                    <p className="mt-2 text-sm font-semibold">
                                        {formatDate(currentUser.createdAt)}
                                    </p>
                                </div>
                            </div>
                        </Card>
                    ) : null}

                    <EmptyState
                        title="Listagem ainda não suportada pelo contrato"
                        description="A tela foi estruturada para o visual do Stitch, mas a listagem de administradores depende de um endpoint não documentado em `docs/API.md`. Mantivemos a criação administrativa funcional e deixamos a lacuna explícita."
                    />
                </div>
            </div>
        </div>
    );
}

function AdminUserCreateForm({
    onFeedback,
}: {
    onFeedback: (message: string) => void;
}) {
    return (
        <form
            className="mt-6 space-y-4"
            onSubmit={async (event) => {
                event.preventDefault();
                const formData = new FormData(event.currentTarget);
                const payload = Object.fromEntries(formData.entries());
                const response = await fetch("/api/users", {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify(payload),
                });
                const data = await response.json();

                onFeedback(
                    response.ok && data.success
                        ? `Usuário ${data.data.user.name} criado com role ${data.data.user.role}.`
                        : (data.error?.message ?? "Falha ao criar usuário."),
                );
            }}
        >
            <Input name="name" placeholder="Nome" />
            <Input name="email" placeholder="Email" type="email" />
            <Input name="document" placeholder="CPF" />
            <Input name="password" placeholder="Senha" type="password" />
            <Select defaultValue="SUBADMIN" name="role">
                <option value="USER">USER</option>
                <option value="SUBADMIN">SUBADMIN</option>
                <option value="ADMIN">ADMIN</option>
            </Select>
            <Button type="submit">Criar usuário</Button>
        </form>
    );
}
