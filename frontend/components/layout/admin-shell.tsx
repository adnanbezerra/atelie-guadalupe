import Link from "next/link";
import type { ReactNode } from "react";
import { Logo } from "@/components/layout/logo";
import { cn } from "@/lib/utils";

const adminItems = [
  { href: "/admin", label: "Dashboard" },
  { href: "/admin/produtos", label: "Produtos" },
  { href: "/admin/cobranca", label: "Cobrança" },
  { href: "/admin/usuarios", label: "Usuários" },
];

export function AdminShell({
  children,
  currentPath,
}: {
  children: ReactNode;
  currentPath: string;
}) {
  return (
    <div className="min-h-screen bg-[linear-gradient(180deg,#f7f6f3_0%,#f2eee7_100%)] text-[var(--color-foreground)]">
      <div className="grid min-h-screen lg:grid-cols-[280px_1fr]">
        <aside className="border-r border-[color:var(--color-border)] bg-[var(--color-admin-surface)] px-6 py-8">
          <Logo compact href="/admin" />
          <p className="mt-4 text-xs font-semibold uppercase tracking-[0.28em] text-[var(--color-muted)]">
            Administração
          </p>
          <nav className="mt-8 space-y-2">
            {adminItems.map((item) => (
              <Link
                className={cn(
                  "block rounded-2xl px-4 py-3 text-sm font-semibold transition",
                  currentPath === item.href
                    ? "bg-[var(--color-primary)] text-white shadow-[0_18px_40px_-22px_rgba(153,102,51,0.95)]"
                    : "text-[var(--color-foreground)] hover:bg-white",
                )}
                href={item.href}
                key={item.href}
              >
                {item.label}
              </Link>
            ))}
          </nav>
          <div className="mt-10 rounded-[1.5rem] border border-[color:var(--color-border)] bg-white/70 p-5">
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-[var(--color-primary)]">
              Modo atual
            </p>
            <p className="mt-2 font-display text-2xl font-semibold">
              Operação do Ateliê
            </p>
            <p className="mt-2 text-sm leading-6 text-[var(--color-muted)]">
              As telas administrativas seguem o Stitch, mas só consomem endpoints
              documentados em `docs/API.md`.
            </p>
          </div>
        </aside>
        <div className="min-w-0">
          <div className="sticky top-0 z-30 border-b border-[color:var(--color-border)] bg-white/80 px-6 py-4 backdrop-blur xl:px-10">
            <div className="flex items-center justify-between gap-4">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.28em] text-[var(--color-muted)]">
                  Painel Administrativo
                </p>
                <h1 className="font-display text-3xl font-semibold text-[var(--color-foreground)]">
                  Ateliê Guadalupe
                </h1>
              </div>
              <div className="rounded-2xl bg-[var(--color-primary-soft)] px-4 py-3 text-right">
                <p className="text-xs uppercase tracking-[0.24em] text-[var(--color-primary)]">
                  Sessão
                </p>
                <p className="text-sm font-semibold text-[var(--color-primary)]">
                  Admin conectado via token
                </p>
              </div>
            </div>
          </div>
          <main className="px-6 py-8 xl:px-10">{children}</main>
        </div>
      </div>
    </div>
  );
}
