import Link from "next/link";
import { ProductLine } from "@/lib/types";

type SiteHeaderProps = {
    lines?: ProductLine[];
};

export function SiteHeader({ lines = [] }: SiteHeaderProps) {
    void lines;

    return (
        <header className="sticky top-0 z-50 border-b border-primary/10 bg-white/80 backdrop-blur-md">
            <div className="mx-auto flex h-20 max-w-7xl items-center justify-between gap-4 px-4 sm:px-6 lg:px-8">
                <div className="flex items-center gap-3">
                    <Link href="/" className="flex items-center gap-3">
                        <div className="text-primary">
                            <span className="material-symbols-outlined text-4xl [font-variation-settings:'FILL'_1]">
                                auto_awesome
                            </span>
                        </div>
                        <span className="font-display text-2xl font-bold tracking-tight text-primary">
                            Ateliê Guadalupe
                        </span>
                    </Link>
                    <nav className="hidden items-center gap-8 md:flex">
                        <Link
                            href="/beleza-natural"
                            className="text-sm font-bold uppercase tracking-[0.2em] text-primary"
                        >
                            Beleza Natural
                        </Link>
                        <Link
                            href="/artesanato"
                            className="text-sm font-bold uppercase tracking-[0.2em] text-primary"
                        >
                            Artesanato
                        </Link>
                    </nav>
                </div>
                <div className="flex items-center gap-4">
                    <div className="relative hidden sm:block">
                        <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-slate-400">
                            search
                        </span>
                        <input
                            className="w-48 rounded-full border-none bg-primary/5 py-2 pl-10 pr-4 text-sm outline-none"
                            placeholder="Buscar..."
                            type="text"
                        />
                    </div>
                    <div className="flex items-center gap-3">
                        <Link
                            href="/carrinho"
                            className="rounded-full p-2 text-slate-600 transition-colors hover:text-primary"
                        >
                            <span className="material-symbols-outlined">
                                shopping_bag
                            </span>
                        </Link>
                        <Link
                            href="/admin"
                            className="rounded-full p-2 text-slate-600 transition-colors hover:text-primary"
                        >
                            <span className="material-symbols-outlined">
                                person
                            </span>
                        </Link>
                    </div>
                </div>
            </div>
        </header>
    );
}
