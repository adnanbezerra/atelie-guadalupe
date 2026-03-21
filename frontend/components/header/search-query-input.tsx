"use client";

import { useEffect, useState, useTransition } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";

type SearchQueryInputProps = {
    initialValue?: string;
    placeholder?: string;
    searchPath?: string;
};

export function SearchQueryInput({
    initialValue = "",
    placeholder = "Buscar cremes...",
    searchPath,
}: SearchQueryInputProps) {
    const router = useRouter();
    const pathname = usePathname();
    const searchParams = useSearchParams();
    const [value, setValue] = useState(initialValue);
    const [, startTransition] = useTransition();

    useEffect(() => {
        setValue(initialValue);
    }, [initialValue]);

    useEffect(() => {
        const timeout = window.setTimeout(() => {
            const nextParams = new URLSearchParams(searchParams.toString());

            if (value.trim()) {
                nextParams.set("search", value.trim());
            } else {
                nextParams.delete("search");
            }

            const query = nextParams.toString();
            const targetPath = searchPath ?? pathname;
            const href = query ? `${targetPath}?${query}` : targetPath;
            const currentHref = searchParams.toString()
                ? `${pathname}?${searchParams.toString()}`
                : pathname;

            if (href === currentHref) {
                return;
            }

            startTransition(() => {
                router.replace(href, { scroll: false });
            });
        }, 250);

        return () => {
            window.clearTimeout(timeout);
        };
    }, [pathname, router, searchParams, searchPath, startTransition, value]);

    return (
        <div className="relative hidden w-full max-w-xs sm:flex">
            <span className="material-symbols-outlined absolute top-1/2 left-3 -translate-y-1/2 text-lg text-slate-400">
                search
            </span>
            <input
                className="w-full rounded-lg bg-slate-100 py-2 pr-4 pl-10 text-sm outline-none"
                onChange={(event) => setValue(event.target.value)}
                placeholder={placeholder}
                value={value}
            />
        </div>
    );
}
