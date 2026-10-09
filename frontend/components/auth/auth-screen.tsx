"use client";

import Link from "next/link";
import Image from "next/image";
import { useRouter, useSearchParams } from "next/navigation";
import { FormEvent, useState } from "react";
import { FeedbackDialog } from "@/components/shared/feedback-dialog";
import { notifyAuthSessionChanged } from "@/lib/auth-session";

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
              code?: string;
              message?: string;
              details?: Array<{
                  path?: string | string[];
                  message?: string;
              }>;
          };
      };

const ADMIN_ROLES = new Set(["ADMIN", "SUBADMIN"]);
const PASSWORD_PATTERN =
    /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[^A-Za-z0-9]).{8,72}$/;

function EyeIcon({ hidden }: { hidden: boolean }) {
    return (
        <svg
            aria-hidden="true"
            className="size-5"
            fill="none"
            viewBox="0 0 24 24"
        >
            <path
                d="M2.5 12s3.5-6 9.5-6 9.5 6 9.5 6-3.5 6-9.5 6-9.5-6-9.5-6Z"
                stroke="currentColor"
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth="2"
            />
            <circle
                cx="12"
                cy="12"
                r="2.5"
                stroke="currentColor"
                strokeWidth="2"
            />
            {hidden ? (
                <path
                    d="m4 4 16 16"
                    stroke="currentColor"
                    strokeLinecap="round"
                    strokeWidth="2"
                />
            ) : null}
        </svg>
    );
}

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
            label: "CPF ou CNPJ (opcional)",
            icon: "badge",
            placeholder: "Somente números",
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
    const [errorField, setErrorField] = useState<string | null>(null);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [showPassword, setShowPassword] = useState(false);
    const isLogin = mode === "login";
    const nextPath = searchParams.get("next");
    const safeNextPath =
        nextPath?.startsWith("/") && !nextPath.startsWith("//")
            ? nextPath
            : null;
    const loginContext = safeNextPath?.startsWith("/checkout")
        ? "Entre para continuar sua compra com segurança."
        : safeNextPath?.startsWith("/perfil")
          ? "Entre para acessar sua conta e seus pedidos."
          : "Bem-vindo de volta. Entre na sua conta para continuar.";

    async function handleSubmit(event: FormEvent<HTMLFormElement>) {
        event.preventDefault();
        setError("");
        setErrorField(null);
        setIsSubmitting(true);

        const formData = new FormData(event.currentTarget);
        const body = Object.fromEntries(formData.entries()) as Record<
            string,
            string
        >;

        if (!isLogin) {
            const document = body.document.replace(/\D/g, "");
            body.document = document;

            if (document && document.length !== 11 && document.length !== 14) {
                setErrorField("document");
                setError(
                    "Informe um CPF com 11 dígitos ou CNPJ com 14 dígitos, ou deixe o campo vazio.",
                );
                setIsSubmitting(false);
                return;
            }

            if (!PASSWORD_PATTERN.test(body.password)) {
                setErrorField("password");
                setError(
                    "Use de 8 a 72 caracteres, com letra maiúscula, letra minúscula, número e caractere especial.",
                );
                setIsSubmitting(false);
                return;
            }

            if (!document) {
                delete body.document;
            }
        }

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
                if (!isLogin && !payload.success) {
                    const detailPath = payload.error?.details?.[0]?.path;
                    const field = Array.isArray(detailPath)
                        ? detailPath.at(-1)
                        : detailPath;
                    const message = payload.error?.message?.toLowerCase() ?? "";
                    const mappedField =
                        field === "name" ||
                        field === "email" ||
                        field === "document" ||
                        field === "password"
                            ? field
                            : message.includes("documento")
                              ? "document"
                              : message.includes("e-mail") ||
                                  message.includes("email")
                                ? "email"
                                : null;

                    setErrorField(mappedField);
                }
                throw new Error(
                    payload.success
                        ? "Não foi possível autenticar."
                        : (payload.error?.message ??
                              "Não foi possível autenticar."),
                );
            }

            document.cookie = `auth_token=${payload.data.token}; path=/; max-age=2592000; samesite=lax`;
            notifyAuthSessionChanged();
            const isAdmin = ADMIN_ROLES.has(payload.data.user.role ?? "");
            const adminTarget = nextPath?.startsWith("/admin")
                ? nextPath
                : "/admin";
            const userTarget = safeNextPath ?? "/";
            router.push(isAdmin ? adminTarget : userTarget);
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
                                ? loginContext
                                : "Crie sua conta para continuar."}
                        </p>
                    </div>

                    <form className="space-y-6" onSubmit={handleSubmit}>
                        {fields[mode].map((field) => (
                            <div key={field.id}>
                                <div>
                                    <label
                                        className="mb-2 block text-xs font-bold uppercase tracking-widest text-[#4A3B2E]"
                                        htmlFor={field.id}
                                    >
                                        {field.label}
                                    </label>
                                </div>
                                <div className="relative">
                                    <span
                                        aria-hidden="true"
                                        className="material-symbols-outlined absolute left-4 top-1/2 -translate-y-1/2 text-[#334155]/40"
                                    >
                                        {field.icon}
                                    </span>
                                    <input
                                        aria-describedby={
                                            !isLogin && field.id === "document"
                                                ? "document-help"
                                                : !isLogin &&
                                                    field.id === "password"
                                                  ? "password-help"
                                                  : undefined
                                        }
                                        aria-invalid={
                                            errorField === field.id
                                                ? true
                                                : undefined
                                        }
                                        autoComplete={field.autoComplete}
                                        className="w-full rounded-lg border-none bg-[#F4F1ED] py-4 pl-12 pr-14 text-[#1A2E44] transition-all duration-200 placeholder:text-[#334155]/50 focus:ring-2 focus:ring-[#8C6D4F] aria-[invalid=true]:ring-2 aria-[invalid=true]:ring-red-700"
                                        id={field.id}
                                        inputMode={
                                            field.id === "document"
                                                ? "numeric"
                                                : undefined
                                        }
                                        maxLength={
                                            field.id === "document"
                                                ? 18
                                                : field.id === "password"
                                                  ? 72
                                                  : undefined
                                        }
                                        name={field.id}
                                        placeholder={field.placeholder}
                                        required={field.id !== "document"}
                                        type={
                                            field.id === "password" &&
                                            showPassword
                                                ? "text"
                                                : field.type
                                        }
                                    />
                                    {field.id === "password" ? (
                                        <button
                                            aria-label={
                                                showPassword
                                                    ? "Ocultar senha"
                                                    : "Mostrar senha"
                                            }
                                            className="absolute right-2 top-1/2 flex min-h-11 min-w-11 -translate-y-1/2 items-center justify-center rounded-lg text-[#334155]/70 transition hover:bg-white/70 hover:text-[#1A2E44] focus:outline-none focus:ring-2 focus:ring-[#8C6D4F]"
                                            onClick={() =>
                                                setShowPassword(
                                                    (current) => !current,
                                                )
                                            }
                                            type="button"
                                        >
                                            <EyeIcon hidden={showPassword} />
                                        </button>
                                    ) : null}
                                </div>
                                {!isLogin && field.id === "document" ? (
                                    <p
                                        className="mt-2 text-sm leading-6 text-[#334155]/80"
                                        id="document-help"
                                    >
                                        CPF ou CNPJ é opcional no cadastro. Ele
                                        será necessário para emitir o pagamento
                                        e a entrega, e não será exibido
                                        publicamente.
                                    </p>
                                ) : null}
                                {!isLogin && field.id === "password" ? (
                                    <p
                                        className="mt-2 text-sm leading-6 text-[#334155]/80"
                                        id="password-help"
                                    >
                                        Use de 8 a 72 caracteres, com maiúscula,
                                        minúscula, número e caractere especial.
                                    </p>
                                ) : null}
                            </div>
                        ))}

                        {isLogin ? (
                            <div className="mb-6 flex justify-end">
                                <Link
                                    className="text-sm font-bold text-primary underline-offset-4 hover:underline"
                                    href={`/recuperar-senha${nextPath ? `?next=${encodeURIComponent(nextPath)}` : ""}`}
                                >
                                    Esqueci minha senha
                                </Link>
                            </div>
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
                                href={`${isLogin ? "/cadastro" : "/login"}${nextPath ? `?next=${encodeURIComponent(nextPath)}` : ""}`}
                            >
                                {isLogin ? "Criar conta" : "Entrar"}
                            </Link>
                            <Link
                                className="block min-h-11 w-full py-3 text-center text-sm font-bold text-primary underline-offset-4 hover:underline"
                                href="/"
                            >
                                Voltar para a loja
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
                    <Image
                        alt="Atmosfera Ateliê Guadalupe"
                        className="absolute inset-0 h-full w-full object-cover"
                        fill
                        priority
                        sizes="50vw"
                        src="/auth-guadalupe.webp"
                    />
                    <div className="absolute inset-0 z-20 flex flex-col justify-end bg-gradient-to-t from-[#1A2E44]/80 via-transparent to-transparent p-16">
                        <div className="max-w-md">
                            <span
                                aria-hidden="true"
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
            <FeedbackDialog
                description={error}
                onOpenChange={(open) => {
                    if (!open) {
                        const fieldToFocus = errorField;
                        setError("");
                        setErrorField(null);
                        if (fieldToFocus) {
                            window.setTimeout(
                                () =>
                                    document
                                        .getElementById(fieldToFocus)
                                        ?.focus(),
                                0,
                            );
                        }
                    }
                }}
                open={Boolean(error)}
                title="Não foi possível continuar"
            />
        </div>
    );
}
