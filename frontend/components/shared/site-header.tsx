import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

export function SiteHeader() {
    return (
        <header className="sticky top-0 z-40 border-b border-white/60 bg-white/80 backdrop-blur-xl">
            <div className="mx-auto flex max-w-7xl items-center justify-between gap-4 px-4 py-5 sm:px-6 lg:px-8">
                <Link href="/" className="flex items-center gap-3">
                    <div className="flex h-11 w-11 items-center justify-center rounded-full bg-primary/10 text-primary">
                        ✦
                    </div>
                    <div>
                        <p className="font-display text-2xl font-bold text-primary">
                            Ateliê Guadalupe
                        </p>
                        <p className="text-xs uppercase tracking-[0.28em] text-muted-foreground">
                            Beleza e devoção
                        </p>
                    </div>
                </Link>
                <nav className="hidden items-center gap-8 md:flex">
                    <Link
                        href="/beleza-natural"
                        className="text-sm font-semibold text-foreground/80 hover:text-primary"
                    >
                        Beleza Natural
                    </Link>
                    <Link
                        href="/artesanato"
                        className="text-sm font-semibold text-foreground/80 hover:text-primary"
                    >
                        Artesanato
                    </Link>
                    <Link
                        href="/admin"
                        className="text-sm font-semibold text-foreground/80 hover:text-primary"
                    >
                        Admin
                    </Link>
                </nav>
                <div className="flex items-center gap-2">
                    <Badge tone="muted" className="hidden md:inline-flex">
                        Atelier vivo
                    </Badge>
                    <Link href="/carrinho">
                        <Button variant="outline">Meu Carrinho</Button>
                    </Link>
                </div>
            </div>
        </header>
    );
}
