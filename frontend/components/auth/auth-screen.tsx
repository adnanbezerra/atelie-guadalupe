"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { FormEvent, useState } from "react";

type AuthMode = "login" | "register";

type ApiEnvelope =
    | {
          success: true;
          data: {
              token: string;
              user: {
                  role?: string;
              };
          };
      }
    | {
          success: false;
          error?: {
              message?: string;
          };
      };

const ADMIN_ROLES = new Set(["ADMIN", "SUBADMIN"]);

const fields = {
    login: [
        {
            id: "email",
            label: "Seu e-mail",
            icon: "mail",
            placeholder: "exemplo@email.com",
            type: "email",
            autoComplete: "email",
        },
        {
            id: "password",
            label: "Senha",
            icon: "lock",
            placeholder: "••••••••",
            type: "password",
            autoComplete: "current-password",
        },
    ],
    register: [
        {
            id: "name",
            label: "Nome completo",
            icon: "person",
            placeholder: "Maria da Silva",
            type: "text",
            autoComplete: "name",
        },
        {
            id: "email",
            label: "Seu e-mail",
            icon: "mail",
            placeholder: "exemplo@email.com",
            type: "email",
            autoComplete: "email",
        },
        {
            id: "document",
            label: "Documento",
            icon: "badge",
            placeholder: "12345678900",
            type: "text",
            autoComplete: "off",
        },
        {
            id: "password",
            label: "Senha",
            icon: "lock",
            placeholder: "••••••••",
            type: "password",
            autoComplete: "new-password",
        },
    ],
} satisfies Record<
    AuthMode,
    Array<{
        id: string;
        label: string;
        icon: string;
        placeholder: string;
        type: string;
        autoComplete: string;
    }>
>;

export function AuthScreen({ mode }: { mode: AuthMode }) {
    const router = useRouter();
    const searchParams = useSearchParams();
    const [error, setError] = useState("");
    const [isSubmitting, setIsSubmitting] = useState(false);
    const isLogin = mode === "login";
    const nextPath = searchParams.get("next");

    async function handleSubmit(event: FormEvent<HTMLFormElement>) {
        event.preventDefault();
        setError("");
        setIsSubmitting(true);

        const formData = new FormData(event.currentTarget);
        const body = Object.fromEntries(formData.entries());

        try {
            const response = await fetch(
                isLogin ? "/api/auth/login" : "/api/auth/register",
                {
                    method: "POST",
                    headers: {
                        "Content-Type": "application/json",
                    },
                    body: JSON.stringify(body),
                },
            );
            const payload = (await response.json()) as ApiEnvelope;

            if (!response.ok || !payload.success) {
                throw new Error(
                    payload.success
                        ? "Não foi possível autenticar."
                        : (payload.error?.message ??
                              "Não foi possível autenticar."),
                );
            }

            document.cookie = `auth_token=${payload.data.token}; path=/; max-age=2592000; samesite=lax`;
            const isAdmin = ADMIN_ROLES.has(payload.data.user.role ?? "");
            const adminTarget = nextPath?.startsWith("/admin")
                ? nextPath
                : "/admin";
            router.push(isAdmin ? adminTarget : "/");
            router.refresh();
        } catch (caughtError) {
            setError(
                caughtError instanceof Error
                    ? caughtError.message
                    : "Não foi possível autenticar.",
            );
        } finally {
            setIsSubmitting(false);
        }
    }

    return (
        <div className="flex min-h-screen items-center justify-center bg-[#F4F1ED] p-4 font-public antialiased sm:p-6 lg:p-0">
            <main className="flex min-h-[700px] w-full max-w-6xl flex-col overflow-hidden rounded-xl bg-white shadow-2xl lg:flex-row">
                <div className="flex w-full flex-col justify-center p-8 sm:p-12 lg:w-1/2 lg:p-20">
                    <div className="mb-10 text-center lg:text-left">
                        <h1 className="mb-2 text-3xl font-extrabold tracking-tight text-[#1A2E44]">
                            Ateliê Guadalupe
                        </h1>
                        <p className="font-medium text-[#334155]/70">
                            {isLogin
                                ? "Bem-vindo de volta. Entre na sua conta para continuar."
                                : "Crie sua conta para continuar."}
                        </p>
                    </div>

                    <form className="space-y-6" onSubmit={handleSubmit}>
                        {fields[mode].map((field) => (
                            <div key={field.id}>
                                <div
                                    className={
                                        field.id === "password" && isLogin
                                            ? "mb-2 flex items-center justify-between"
                                            : undefined
                                    }
                                >
                                    <label
                                        className="mb-2 block text-xs font-bold uppercase tracking-widest text-[#4A3B2E]"
                                        htmlFor={field.id}
                                    >
                                        {field.label}
                                    </label>
                                    {field.id === "password" && isLogin ? (
                                        <a
                                            className="text-xs font-semibold text-[#8C6D4F] transition-colors hover:text-[#1A2E44]"
                                            href="#"
                                        >
                                            Esqueci minha senha
                                        </a>
                                    ) : null}
                                </div>
                                <div className="relative">
                                    <span className="material-symbols-outlined absolute left-4 top-1/2 -translate-y-1/2 text-[#334155]/40">
                                        {field.icon}
                                    </span>
                                    <input
                                        autoComplete={field.autoComplete}
                                        className="w-full rounded-lg border-none bg-[#F4F1ED] py-4 pl-12 pr-4 text-[#1A2E44] transition-all duration-200 placeholder:text-[#334155]/30 focus:ring-2 focus:ring-[#8C6D4F]"
                                        id={field.id}
                                        name={field.id}
                                        placeholder={field.placeholder}
                                        required
                                        type={field.type}
                                    />
                                </div>
                            </div>
                        ))}

                        {isLogin ? (
                            <div className="mb-6 flex items-center space-x-3">
                                <input
                                    className="h-4 w-4 rounded border-[#F4F1ED] text-[#8C6D4F] focus:ring-[#8C6D4F]"
                                    id="remember"
                                    type="checkbox"
                                />
                                <label
                                    className="text-sm text-[#334155]/80"
                                    htmlFor="remember"
                                >
                                    Lembrar de mim
                                </label>
                            </div>
                        ) : null}

                        {error ? (
                            <p className="rounded-lg bg-[#F4F1ED] px-4 py-3 text-sm font-semibold text-[#4A3B2E]">
                                {error}
                            </p>
                        ) : null}

                        <div className="space-y-4 pt-2">
                            <button
                                className="w-full rounded-lg bg-[#1A2E44] py-4 font-bold text-white shadow-lg shadow-[#1A2E44]/20 transition-all hover:bg-[#4A3B2E] disabled:cursor-not-allowed disabled:opacity-60"
                                disabled={isSubmitting}
                                type="submit"
                            >
                                {isSubmitting
                                    ? "Aguarde"
                                    : isLogin
                                      ? "Entrar"
                                      : "Criar conta"}
                            </button>
                            <div className="relative flex items-center py-4">
                                <div className="flex-grow border-t border-[#F4F1ED]" />
                                <span className="mx-4 flex-shrink text-xs font-bold uppercase tracking-widest text-[#334155]/30">
                                    ou
                                </span>
                                <div className="flex-grow border-t border-[#F4F1ED]" />
                            </div>
                            <Link
                                className="block w-full rounded-lg border-2 border-[#F4F1ED] bg-white py-4 text-center font-bold text-[#1A2E44] transition-all hover:bg-[#F4F1ED]"
                                href={isLogin ? "/cadastro" : "/login"}
                            >
                                {isLogin ? "Criar conta" : "Entrar"}
                            </Link>
                        </div>
                    </form>

                    <footer className="mt-12 text-center lg:text-left">
                        <p className="text-sm text-[#334155]/50">
                            © 2024 Ateliê Guadalupe.{" "}
                            <br className="sm:hidden" />
                            Beleza natural e arte sacra.
                        </p>
                    </footer>
                </div>

                <div className="relative hidden w-1/2 lg:block">
                    <div className="absolute inset-0 z-10 bg-[#1A2E44]/20" />
                    <img
                        alt="Atmosfera Ateliê Guadalupe"
                        className="absolute inset-0 h-full w-full object-cover"
                        src="/auth-guadalupe.png"
                    />
                    <div className="absolute inset-0 z-20 flex flex-col justify-end bg-gradient-to-t from-[#1A2E44]/80 via-transparent to-transparent p-16">
                        <div className="max-w-md">
                            <span
                                className="material-symbols-outlined mb-6 text-4xl text-white/80"
                                style={{
                                    fontVariationSettings:
                                        "'FILL' 1, 'wght' 400, 'GRAD' 0, 'opsz' 24",
                                }}
                            >
                                spa
                            </span>
                            <h2 className="mb-4 text-3xl font-bold italic text-white">
                                &quot;Onde a fé encontra a forma e a beleza se
                                torna oração.&quot;
                            </h2>
                            <p className="font-light leading-relaxed text-white/80">
                                Descubra nossa curadoria de itens artesanais
                                feitos para elevar o espírito e decorar sua vida
                                com propósito e serenidade.
                            </p>
                        </div>
                    </div>
                </div>
            </main>
        </div>
    );
}
