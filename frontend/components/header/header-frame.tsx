import type { ReactNode } from "react";
import Link from "next/link";
import Image from "next/image";
import logo from "public/logo-empty.png";
import { CartDialogButton } from "./cart-dialog-button";
import { UserDialogButton } from "./user-dialog-button";

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
        <header className="sticky top-0 z-50 w-full border-b border-slate-200 bg-[#f6f6f8]/95 px-4 py-3 backdrop-blur-md sm:px-6 md:px-10">
            <div className="mx-auto flex max-w-7xl items-center gap-3 sm:gap-5">
                <div className="flex min-w-0 items-center gap-3 md:gap-8">
                    <Link
                        aria-label="Ir para a página inicial do Ateliê Guadalupe"
                        className="flex shrink-0 items-center gap-3 rounded-lg"
                        href="/"
                    >
                        <Image
                            src={logo}
                            alt="Logo do Guadalupe Ateliê"
                            className="h-11 w-auto sm:h-[50px]"
                        />
                        <span className="hidden font-display text-xl font-bold tracking-tight lg:block">
                            Ateliê Guadalupe
                        </span>
                    </Link>
                    <nav
                        aria-label="Coleções"
                        className="hidden items-center gap-6 md:flex"
                    >
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
                <div className="flex min-w-0 flex-1 items-center justify-end gap-2 sm:gap-4">
                    {searchSlot}
                    <div className="flex shrink-0 gap-2">
                        <CartDialogButton />
                        <UserDialogButton />
                    </div>
                </div>
            </div>
            <nav
                aria-label="Coleções no celular"
                className="mx-auto mt-2 flex max-w-7xl items-center justify-center gap-1 border-t border-slate-200/70 pt-2 md:hidden"
            >
                <Link
                    aria-current={
                        activeCollection === "beauty" ? "page" : undefined
                    }
                    className={`flex min-h-11 flex-1 items-center justify-center rounded-lg px-3 py-2 text-center text-sm font-bold ${activeCollection === "beauty" ? "bg-primary text-white" : "text-slate-700 hover:bg-white"}`}
                    href="/beleza-natural"
                >
                    Beleza Natural
                </Link>
                <Link
                    aria-current={
                        activeCollection === "crafts" ? "page" : undefined
                    }
                    className={`flex min-h-11 flex-1 items-center justify-center rounded-lg px-3 py-2 text-center text-sm font-bold ${activeCollection === "crafts" ? "bg-primary text-white" : "text-slate-700 hover:bg-white"}`}
                    href="/artesanato"
                >
                    Artesanato
                </Link>
            </nav>
        </header>
    );
}
