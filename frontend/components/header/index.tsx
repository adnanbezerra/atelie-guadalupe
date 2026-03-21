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
                <div className="relative hidden w-full max-w-xs sm:flex">
                    <span className="material-symbols-outlined absolute top-1/2 left-3 -translate-y-1/2 text-lg text-slate-400">
                        search
                    </span>
                    <input
                        className="w-full rounded-lg bg-slate-100 py-2 pr-4 pl-10 text-sm outline-none"
                        onChange={(event) => setSearch(event.target.value)}
                        placeholder="Buscar cremes..."
                        value={search}
                    />
                </div>
            }
        />
    );
}
