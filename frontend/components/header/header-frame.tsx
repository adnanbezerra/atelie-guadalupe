import type { ReactNode } from "react";
import Link from "next/link";

type HeaderFrameProps = {
    activeCollection?: "beauty" | "crafts";
    searchSlot?: ReactNode;
};

export function HeaderFrame({
    activeCollection,
    searchSlot,
}: HeaderFrameProps) {
    const beautyClassName =
        activeCollection === "beauty"
            ? "border-b-2 border-primary text-sm font-medium"
            : "text-sm font-medium";
    const craftsClassName =
        activeCollection === "crafts"
            ? "border-b-2 border-primary text-sm font-medium"
            : "text-sm font-medium";

    return (
        <header className="sticky top-0 z-50 w-full border-b border-slate-200 bg-[#f6f6f8]/80 px-6 py-4 backdrop-blur-md md:px-10">
            <div className="mx-auto flex max-w-7xl items-center justify-between">
                <div className="flex items-center gap-8">
                    <Link className="flex items-center gap-3" href="/">
                        <span className="material-symbols-outlined text-3xl text-primary">
                            spa
                        </span>
                        <h2 className="font-display text-xl font-bold tracking-tight">
                            Ateliê Guadalupe
                        </h2>
                    </Link>
                    <nav className="hidden items-center gap-6 md:flex">
                        <Link
                            className={beautyClassName}
                            href="/beleza-natural"
                        >
                            Beleza Natural
                        </Link>
                        <Link className={craftsClassName} href="/artesanato">
                            Artesanato
                        </Link>
                    </nav>
                </div>
                <div className="flex flex-1 items-center justify-end gap-4">
                    {searchSlot}
                    <div className="flex gap-2">
                        <Link
                            className="rounded-lg bg-slate-100 p-2"
                            href="/carrinho"
                        >
                            <span className="material-symbols-outlined text-slate-700">
                                shopping_bag
                            </span>
                        </Link>
                        <Link
                            className="rounded-lg bg-slate-100 p-2"
                            href="/admin"
                        >
                            <span className="material-symbols-outlined text-slate-700">
                                person
                            </span>
                        </Link>
                    </div>
                </div>
            </div>
        </header>
    );
}
