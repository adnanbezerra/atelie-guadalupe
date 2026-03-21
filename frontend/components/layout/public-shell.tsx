import Link from "next/link";
import type { ReactNode } from "react";
import { Logo } from "@/components/layout/logo";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";

const navItems = [
    { href: "/beleza-natural", label: "Beleza Natural" },
    { href: "/artesanato", label: "Artesanato" },
    { href: "/carrinho", label: "Meu Carrinho" },
];

export function PublicShell({
    children,
    accent = "warm",
}: {
    children: ReactNode;
    accent?: "warm" | "craft";
}) {
    return (
        <div
            className={cn(
                "min-h-screen",
                accent === "craft"
                    ? "bg-[radial-gradient(circle_at_top_left,rgba(182,117,68,0.12),transparent_30%),linear-gradient(180deg,#f8f1ea_0%,#fffdf9_40%,#fbf7f1_100%)]"
                    : "bg-[radial-gradient(circle_at_top_left,rgba(141,164,112,0.12),transparent_30%),linear-gradient(180deg,#fbf6ef_0%,#fffdf8_35%,#f7f1e8_100%)]",
            )}
        >
            <header className="sticky top-0 z-40 border-b border-[color:var(--color-border)] bg-white/80 backdrop-blur-xl">
                <div className="mx-auto flex max-w-7xl items-center justify-between gap-6 px-4 py-4 sm:px-6 lg:px-8">
                    <Logo compact />
                    <nav className="hidden items-center gap-8 lg:flex">
                        {navItems.map((item) => (
                            <Link
                                className="text-sm font-semibold text-[var(--color-foreground)] transition hover:text-[var(--color-primary)]"
                                href={item.href}
                                key={item.href}
                            >
                                {item.label}
                            </Link>
                        ))}
                    </nav>
                    <div className="hidden min-w-72 flex-1 justify-end md:flex">
                        <div className="relative w-full max-w-sm">
                            <Input
                                className="pl-11"
                                placeholder="Buscar no ateliê..."
                            />
                            <span className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-[var(--color-muted)]">
                                ⌕
                            </span>
                        </div>
                    </div>
                    <div className="flex items-center gap-3">
                        <Link href="/carrinho">
                            <Button size="sm" variant="secondary">
                                Carrinho
                            </Button>
                        </Link>
                        <Button size="sm" variant="ghost">
                            Perfil
                        </Button>
                    </div>
                </div>
            </header>
            {children}
            <footer className="mt-24 border-t border-[color:var(--color-border)] bg-[var(--color-foreground)] text-white">
                <div className="mx-auto grid max-w-7xl gap-12 px-4 py-16 sm:px-6 lg:grid-cols-4 lg:px-8">
                    <div className="lg:col-span-2">
                        <Logo className="[&_*]:text-white" compact />
                        <p className="mt-6 max-w-md text-sm leading-7 text-white/70">
                            Cosméticos botânicos, cerâmica autoral e devoção
                            cotidiana reunidos em uma vitrine contemplativa,
                            fiel às telas do Stitch e pronta para consumir a API
                            do ateliê.
                        </p>
                    </div>
                    <div>
                        <p className="text-xs font-semibold uppercase tracking-[0.28em] text-[var(--color-accent)]">
                            Loja
                        </p>
                        <div className="mt-4 space-y-3 text-sm text-white/70">
                            <Link
                                className="block hover:text-white"
                                href="/beleza-natural"
                            >
                                Beleza Natural
                            </Link>
                            <Link
                                className="block hover:text-white"
                                href="/artesanato"
                            >
                                Artesanato
                            </Link>
                            <Link
                                className="block hover:text-white"
                                href="/carrinho"
                            >
                                Meu Carrinho
                            </Link>
                        </div>
                    </div>
                    <div>
                        <p className="text-xs font-semibold uppercase tracking-[0.28em] text-[var(--color-accent)]">
                            Suporte
                        </p>
                        <div className="mt-4 space-y-3 text-sm text-white/70">
                            <p>Pedidos e devoluções</p>
                            <p>Atendimento pastoral</p>
                            <p>contato@guadalupe.com</p>
                        </div>
                    </div>
                </div>
            </footer>
        </div>
    );
}
