"use client";

import Image from "next/image";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { FormEvent, useEffect, useRef, useState } from "react";
import { FeedbackDialog } from "@/components/shared/feedback-dialog";

type ResetStage = "request" | "confirm";

type ApiEnvelope =
    | {
          success: true;
          data: {
              message: string;
          };
      }
    | {
          success: false;
          error?: {
              code?: string;
              message?: string;
          };
      };

type Feedback = {
    title: string;
    description: string;
    confirmLabel?: string;
    redirectToLogin?: boolean;
    focusCode?: boolean;
};

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const COOLDOWN_STORAGE_KEY = "atelie-password-reset-cooldown";
const PASSWORD_PATTERN =
    /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[^A-Za-z0-9]).{8,72}$/;

function ArrowLeftIcon() {
    return (
        <svg
            aria-hidden="true"
            className="size-5"
            fill="none"
            viewBox="0 0 24 24"
        >
            <path
                d="M15 18l-6-6 6-6"
                stroke="currentColor"
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth="2"
            />
        </svg>
    );
}

function MailIcon() {
    return (
        <svg
            aria-hidden="true"
            className="size-5"
            fill="none"
            viewBox="0 0 24 24"
        >
            <rect
                height="14"
                rx="2"
                stroke="currentColor"
                strokeWidth="2"
                width="18"
                x="3"
                y="5"
            />
            <path
                d="m4 7 8 6 8-6"
                stroke="currentColor"
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth="2"
            />
        </svg>
    );
}

function LockIcon() {
    return (
        <svg
            aria-hidden="true"
            className="size-5"
            fill="none"
            viewBox="0 0 24 24"
        >
            <rect
                height="10"
                rx="2"
                stroke="currentColor"
                strokeWidth="2"
                width="14"
                x="5"
                y="11"
            />
            <path
                d="M8 11V8a4 4 0 0 1 8 0v3"
                stroke="currentColor"
                strokeLinecap="round"
                strokeWidth="2"
            />
        </svg>
    );
}

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

function ShieldIcon() {
    return (
        <svg
            aria-hidden="true"
            className="size-10"
            fill="none"
            viewBox="0 0 24 24"
        >
            <path
                d="M12 3 5 6v5c0 4.7 2.9 8.4 7 10 4.1-1.6 7-5.3 7-10V6l-7-3Z"
                stroke="currentColor"
                strokeLinejoin="round"
                strokeWidth="1.8"
            />
            <path
                d="m9 12 2 2 4-4"
                stroke="currentColor"
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth="1.8"
            />
        </svg>
    );
}

function requestErrorMessage(status: number) {
    if (status === 422) return "Digite um e-mail válido para continuar.";
    if (status === 429) {
        return "O limite de solicitações foi atingido. Aguarde 15 minutos antes de tentar novamente.";
    }

    return "Não foi possível enviar o código agora. Verifique sua conexão e tente novamente.";
}

function confirmErrorMessage(status: number) {
    if (status === 401) {
        return "O código é inválido, expirou ou já foi usado. Solicite um novo código e tente novamente.";
    }
    if (status === 422) {
        return "Confira se o código tem 6 dígitos e se a nova senha atende a todos os requisitos.";
    }
    if (status === 429) {
        return "O limite de tentativas foi atingido. Aguarde 15 minutos e solicite um novo código.";
    }

    return "Não foi possível redefinir sua senha agora. Verifique sua conexão e tente novamente.";
}

export function PasswordResetScreen() {
    const router = useRouter();
    const searchParams = useSearchParams();
    const codeInputRef = useRef<HTMLInputElement>(null);
    const [stage, setStage] = useState<ResetStage>("request");
    const [email, setEmail] = useState("");
    const [code, setCode] = useState("");
    const [newPassword, setNewPassword] = useState("");
    const [showPassword, setShowPassword] = useState(false);
    const [pendingAction, setPendingAction] = useState<ResetStage | null>(null);
    const [cooldown, setCooldown] = useState(0);
    const [feedback, setFeedback] = useState<Feedback | null>(null);
    const nextPath = searchParams.get("next");
    const loginHref = `/login${nextPath ? `?next=${encodeURIComponent(nextPath)}` : ""}`;

    useEffect(() => {
        try {
            const stored = window.localStorage.getItem(COOLDOWN_STORAGE_KEY);
            if (!stored) return;

            const parsed = JSON.parse(stored) as {
                email?: string;
                expiresAt?: number;
            };
            const remaining = Math.ceil(
                ((parsed.expiresAt ?? 0) - Date.now()) / 1000,
            );

            if (remaining <= 0 || !parsed.email) {
                window.localStorage.removeItem(COOLDOWN_STORAGE_KEY);
                return;
            }

            setEmail(parsed.email);
            setStage("confirm");
            setCooldown(remaining);
        } catch {
            window.localStorage.removeItem(COOLDOWN_STORAGE_KEY);
        }
    }, []);

    useEffect(() => {
        if (cooldown <= 0) {
            window.localStorage.removeItem(COOLDOWN_STORAGE_KEY);
            return;
        }

        const timeout = window.setTimeout(
            () => setCooldown((current) => Math.max(0, current - 1)),
            1000,
        );

        return () => window.clearTimeout(timeout);
    }, [cooldown]);

    async function requestCode() {
        const normalizedEmail = email.trim().toLowerCase();

        if (!EMAIL_PATTERN.test(normalizedEmail)) {
            setFeedback({
                title: "Confira seu e-mail",
                description: "Digite um e-mail válido para continuar.",
            });
            return;
        }

        setPendingAction("request");

        try {
            const response = await fetch("/api/auth/password-reset/request", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ email: normalizedEmail }),
            });
            const payload = (await response.json()) as ApiEnvelope;

            if (!response.ok || !payload.success) {
                setFeedback({
                    title: "Não foi possível enviar o código",
                    description: requestErrorMessage(response.status),
                });
                return;
            }

            setEmail(normalizedEmail);
            setCode("");
            setStage("confirm");
            setCooldown(60);
            window.localStorage.setItem(
                COOLDOWN_STORAGE_KEY,
                JSON.stringify({
                    email: normalizedEmail,
                    expiresAt: Date.now() + 60_000,
                }),
            );
            setFeedback({
                title: "Confira seu e-mail",
                description:
                    "Se existir uma conta ativa com esse e-mail, você receberá um código enviado pelo Ateliê Guadalupe. Ele vale por 10 minutos. Confira também as pastas de spam e lixo eletrônico.",
                confirmLabel: "Digitar o código",
                focusCode: true,
            });
        } catch {
            setFeedback({
                title: "Não foi possível enviar o código",
                description: requestErrorMessage(0),
            });
        } finally {
            setPendingAction(null);
        }
    }

    async function handleRequest(event: FormEvent<HTMLFormElement>) {
        event.preventDefault();
        await requestCode();
    }

    async function handleConfirm(event: FormEvent<HTMLFormElement>) {
        event.preventDefault();

        if (!/^\d{6}$/.test(code)) {
            setFeedback({
                title: "Confira o código",
                description: "Digite os 6 números recebidos por e-mail.",
            });
            return;
        }

        if (!PASSWORD_PATTERN.test(newPassword)) {
            setFeedback({
                title: "Confira a nova senha",
                description:
                    "Use de 8 a 72 caracteres, com letra maiúscula, letra minúscula, número e caractere especial.",
            });
            return;
        }

        setPendingAction("confirm");

        try {
            const response = await fetch("/api/auth/password-reset/confirm", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ email, code, newPassword }),
            });
            const payload = (await response.json()) as ApiEnvelope;

            if (!response.ok || !payload.success) {
                setFeedback({
                    title: "Não foi possível criar a nova senha",
                    description: confirmErrorMessage(response.status),
                });
                return;
            }

            setFeedback({
                title: "Senha redefinida",
                description:
                    "Sua nova senha foi salva. Entre novamente para acessar sua conta.",
                confirmLabel: "Ir para o login",
                redirectToLogin: true,
            });
        } catch {
            setFeedback({
                title: "Não foi possível criar a nova senha",
                description: confirmErrorMessage(0),
            });
        } finally {
            setPendingAction(null);
        }
    }

    function handleFeedbackChange(open: boolean) {
        if (open || !feedback) return;

        const { redirectToLogin, focusCode } = feedback;
        setFeedback(null);

        if (redirectToLogin) {
            router.push(loginHref);
            return;
        }

        if (focusCode) {
            window.setTimeout(() => codeInputRef.current?.focus(), 0);
        }
    }

    return (
        <div className="flex min-h-screen items-center justify-center bg-background p-4 font-public antialiased sm:p-6 lg:p-0">
            <main className="flex min-h-[700px] w-full max-w-6xl overflow-hidden rounded-xl bg-white shadow-[0_28px_70px_-34px_rgba(15,23,42,0.5)] lg:grid lg:grid-cols-2">
                <section className="flex flex-col justify-center p-7 sm:p-12 lg:p-16 xl:p-20">
                    <Link
                        className="mb-5 font-display text-xl font-bold text-foreground lg:hidden"
                        href="/"
                    >
                        Ateliê Guadalupe
                    </Link>
                    <Link
                        className="mb-10 inline-flex min-h-11 w-fit items-center gap-2 rounded-lg px-1 text-sm font-bold text-primary underline-offset-4 hover:underline"
                        href={loginHref}
                    >
                        <ArrowLeftIcon />
                        Voltar para o login
                    </Link>

                    <div className="mb-8" aria-label="Progresso da recuperação">
                        <div className="mb-3 flex items-center justify-between text-xs font-bold text-muted">
                            <span
                                aria-current={
                                    stage === "request" ? "step" : undefined
                                }
                                className={
                                    stage === "request"
                                        ? "text-primary"
                                        : "text-success"
                                }
                            >
                                <span className="sm:hidden">1. E-mail</span>
                                <span className="hidden sm:inline">
                                    1. Confirmar e-mail
                                </span>
                            </span>
                            <span
                                aria-current={
                                    stage === "confirm" ? "step" : undefined
                                }
                                className={
                                    stage === "confirm"
                                        ? "text-primary"
                                        : undefined
                                }
                            >
                                <span className="sm:hidden">2. Nova senha</span>
                                <span className="hidden sm:inline">
                                    2. Código e nova senha
                                </span>
                            </span>
                        </div>
                        <div
                            className="grid grid-cols-2 gap-2"
                            aria-hidden="true"
                        >
                            <span className="h-1 rounded-full bg-primary" />
                            <span
                                className={`h-1 rounded-full ${stage === "confirm" ? "bg-primary" : "bg-slate-200"}`}
                            />
                        </div>
                    </div>

                    <div className="mb-8 max-w-xl">
                        <p className="mb-3 font-sans text-sm font-bold text-primary">
                            Recuperação de acesso
                        </p>
                        <h1 className="font-display text-3xl font-bold leading-tight text-foreground sm:text-4xl">
                            {stage === "request"
                                ? "Vamos confirmar seu e-mail"
                                : "Crie uma nova senha"}
                        </h1>
                        <p className="mt-4 max-w-[65ch] font-sans leading-7 text-muted">
                            {stage === "request"
                                ? "Informe o e-mail usado na sua conta. Enviaremos um código para confirmar que o acesso é seu."
                                : `Digite o código enviado para ${email} e escolha sua nova senha.`}
                        </p>
                        {stage === "confirm" ? (
                            <button
                                className="mt-3 min-h-11 rounded-lg px-1 font-sans text-sm font-bold text-primary underline-offset-4 hover:underline"
                                onClick={() => {
                                    setStage("request");
                                    setCode("");
                                    setNewPassword("");
                                    setCooldown(0);
                                    window.localStorage.removeItem(
                                        COOLDOWN_STORAGE_KEY,
                                    );
                                }}
                                type="button"
                            >
                                Alterar e-mail
                            </button>
                        ) : null}
                    </div>

                    {stage === "request" ? (
                        <form noValidate onSubmit={handleRequest}>
                            <label
                                className="mb-2 block font-sans text-sm font-bold text-foreground"
                                htmlFor="reset-email"
                            >
                                E-mail da sua conta
                            </label>
                            <div className="relative">
                                <span className="absolute left-4 top-1/2 -translate-y-1/2 text-muted">
                                    <MailIcon />
                                </span>
                                <input
                                    autoComplete="email"
                                    autoFocus
                                    className="min-h-14 w-full rounded-lg border border-border bg-slate-50 py-3 pl-12 pr-4 font-sans text-foreground placeholder:text-slate-500 focus:border-primary focus:bg-white focus:ring-2 focus:ring-primary/20"
                                    id="reset-email"
                                    inputMode="email"
                                    name="email"
                                    onChange={(event) =>
                                        setEmail(event.target.value)
                                    }
                                    placeholder="exemplo@email.com"
                                    type="email"
                                    value={email}
                                />
                            </div>
                            <button
                                className="mt-6 min-h-14 w-full rounded-lg bg-primary px-5 py-3 font-sans font-bold text-white shadow-[0_12px_24px_-14px_rgba(25,64,179,0.9)] hover:bg-primary/90 disabled:cursor-not-allowed disabled:opacity-60"
                                disabled={pendingAction !== null}
                                type="submit"
                            >
                                {pendingAction === "request"
                                    ? "Enviando código"
                                    : "Enviar código"}
                            </button>
                        </form>
                    ) : (
                        <form noValidate onSubmit={handleConfirm}>
                            <div>
                                <label
                                    className="mb-2 block font-sans text-sm font-bold text-foreground"
                                    htmlFor="reset-code"
                                >
                                    Código de 6 dígitos
                                </label>
                                <div>
                                    <input
                                        autoComplete="one-time-code"
                                        className="min-h-14 w-full rounded-lg border border-border bg-slate-50 px-4 py-3 text-center font-mono text-xl font-bold tabular-nums tracking-[0.42em] text-foreground placeholder:font-normal placeholder:tracking-[0.42em] placeholder:text-slate-400 focus:border-primary focus:bg-white focus:ring-2 focus:ring-primary/20"
                                        id="reset-code"
                                        inputMode="numeric"
                                        maxLength={6}
                                        name="code"
                                        onChange={(event) =>
                                            setCode(
                                                event.target.value
                                                    .replace(/\D/g, "")
                                                    .slice(0, 6),
                                            )
                                        }
                                        placeholder="000000"
                                        ref={codeInputRef}
                                        value={code}
                                    />
                                </div>
                            </div>

                            <div className="mt-5">
                                <label
                                    className="mb-2 block font-sans text-sm font-bold text-foreground"
                                    htmlFor="new-password"
                                >
                                    Nova senha
                                </label>
                                <div className="relative">
                                    <span className="absolute left-4 top-1/2 -translate-y-1/2 text-muted">
                                        <LockIcon />
                                    </span>
                                    <input
                                        autoComplete="new-password"
                                        className="min-h-14 w-full rounded-lg border border-border bg-slate-50 py-3 pl-12 pr-14 font-sans text-foreground placeholder:text-slate-500 focus:border-primary focus:bg-white focus:ring-2 focus:ring-primary/20"
                                        id="new-password"
                                        maxLength={72}
                                        name="newPassword"
                                        onChange={(event) =>
                                            setNewPassword(event.target.value)
                                        }
                                        placeholder="Digite sua nova senha"
                                        type={
                                            showPassword ? "text" : "password"
                                        }
                                        value={newPassword}
                                    />
                                    <button
                                        aria-label={
                                            showPassword
                                                ? "Ocultar senha"
                                                : "Mostrar senha"
                                        }
                                        className="absolute right-2 top-1/2 flex min-h-11 min-w-11 -translate-y-1/2 items-center justify-center rounded-lg text-muted hover:bg-slate-200 hover:text-foreground"
                                        onClick={() =>
                                            setShowPassword(
                                                (current) => !current,
                                            )
                                        }
                                        type="button"
                                    >
                                        <EyeIcon hidden={showPassword} />
                                    </button>
                                </div>
                                <p className="mt-3 font-sans text-sm leading-6 text-muted">
                                    Use de 8 a 72 caracteres, com maiúscula,
                                    minúscula, número e caractere especial.
                                </p>
                            </div>

                            <button
                                className="mt-6 min-h-14 w-full rounded-lg bg-primary px-5 py-3 font-sans font-bold text-white shadow-[0_12px_24px_-14px_rgba(25,64,179,0.9)] hover:bg-primary/90 disabled:cursor-not-allowed disabled:opacity-60"
                                disabled={pendingAction !== null}
                                type="submit"
                            >
                                {pendingAction === "confirm"
                                    ? "Salvando nova senha"
                                    : "Salvar nova senha"}
                            </button>

                            <div className="mt-5 flex flex-col items-start gap-2 border-t border-border pt-5 sm:flex-row sm:items-center sm:justify-between">
                                <p className="font-sans text-sm text-muted">
                                    O código vence em 10 minutos e permite até 5
                                    tentativas.
                                </p>
                                <button
                                    className="min-h-11 shrink-0 rounded-lg px-2 font-sans text-sm font-bold text-primary underline-offset-4 hover:underline disabled:cursor-not-allowed disabled:text-muted"
                                    disabled={
                                        cooldown > 0 || pendingAction !== null
                                    }
                                    onClick={requestCode}
                                    type="button"
                                >
                                    {cooldown > 0
                                        ? `Reenviar em ${cooldown}s`
                                        : "Reenviar código"}
                                </button>
                            </div>
                        </form>
                    )}
                </section>

                <aside className="relative hidden lg:block">
                    <div className="absolute inset-0 z-10 bg-primary/20" />
                    <Image
                        alt="Atmosfera do Ateliê Guadalupe"
                        className="absolute inset-0 h-full w-full object-cover"
                        fill
                        priority
                        sizes="50vw"
                        src="/auth-guadalupe.webp"
                    />
                    <div className="absolute inset-0 z-20 flex items-end bg-gradient-to-t from-slate-950/85 via-slate-950/10 to-transparent p-12 xl:p-16">
                        <div className="max-w-md text-white">
                            <span className="mb-5 block text-secondary">
                                <ShieldIcon />
                            </span>
                            <h2 className="font-display text-3xl font-bold leading-tight">
                                Seu acesso, protegido com cuidado.
                            </h2>
                            <p className="mt-4 font-sans leading-7 text-white/80">
                                O código confirma que somente você pode escolher
                                uma nova senha para sua conta.
                            </p>
                        </div>
                    </div>
                </aside>
            </main>

            <FeedbackDialog
                confirmLabel={feedback?.confirmLabel}
                description={feedback?.description ?? ""}
                onOpenChange={handleFeedbackChange}
                open={Boolean(feedback)}
                title={feedback?.title ?? ""}
            />
        </div>
    );
}
