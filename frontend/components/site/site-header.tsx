import Link from "next/link";
import { ProductLine } from "@/lib/types";

type SiteHeaderProps = {
    lines?: ProductLine[];
};

export function SiteHeader({ lines = [] }: SiteHeaderProps) {
    const showcaseLines = lines.slice(0, 3);

    return (
        <header className="sticky top-0 z-50 border-b border-white/70 bg-white/75 backdrop-blur-xl">
            <div className="mx-auto flex max-w-7xl flex-col gap-4 px-4 py-4 sm:px-6 lg:px-8">
                <div className="flex items-center justify-between gap-4">
                    <Link href="/" className="flex items-center gap-3">
                        <div className="flex size-11 items-center justify-center rounded-2xl bg-primary text-lg font-bold text-white shadow-lg shadow-primary/20">
                            AG
                        </div>
                        <div>
                            <p className="font-display text-xl font-bold text-primary">
                                Atelie Guadalupe
                            </p>
                            <p className="text-xs uppercase tracking-[0.3em] text-slate-500">
                                Cuidado e arte
                            </p>
                        </div>
                    </Link>
                    <nav className="hidden items-center gap-6 text-sm font-semibold text-slate-600 md:flex">
                        <Link
                            href="/beleza-natural"
                            className="hover:text-primary"
                        >
                            Beleza Natural
                        </Link>
                        <Link href="/artesanato" className="hover:text-primary">
                            Artesanato
                        </Link>
                        <Link href="/carrinho" className="hover:text-primary">
                            Meu Carrinho
                        </Link>
                        <Link href="/admin" className="hover:text-primary">
                            Admin
                        </Link>
                    </nav>
                </div>
                {showcaseLines.length ? (
                    <div className="flex flex-wrap gap-2">
                        {showcaseLines.map((line) => (
                            <span
                                key={line.uuid}
                                className="rounded-full border border-primary/10 bg-primary/5 px-3 py-1 text-xs font-semibold uppercase tracking-[0.2em] text-primary/80"
                            >
                                {line.name}
                            </span>
                        ))}
                    </div>
                ) : null}
            </div>
        </header>
    );
}
