"use client";

import { HeaderFrame } from "./header-frame";

type HeaderProps = {
    search: string;
    setSearch: (value: string) => void;
    activeCollection?: "beauty" | "crafts";
};

export default function Header({
    search,
    setSearch,
    activeCollection,
}: HeaderProps) {
    return (
        <HeaderFrame
            activeCollection={activeCollection}
            searchSlot={
                <div className="relative flex min-w-0 w-full max-w-xs">
                    <span
                        aria-hidden="true"
                        className="material-symbols-outlined pointer-events-none absolute top-1/2 left-3 -translate-y-1/2 text-lg text-slate-500"
                    >
                        search
                    </span>
                    <input
                        aria-label="Buscar produtos"
                        className="min-h-11 w-full min-w-0 rounded-lg border border-slate-200 bg-white py-2 pr-3 pl-10 text-base outline-none placeholder:text-slate-500 focus:border-primary focus:ring-4 focus:ring-primary/15 sm:text-sm"
                        onChange={(event) => setSearch(event.target.value)}
                        placeholder="Buscar..."
                        value={search}
                    />
                </div>
            }
        />
    );
}
