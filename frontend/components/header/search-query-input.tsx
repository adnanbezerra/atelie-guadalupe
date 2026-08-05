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
    placeholder = "Buscar...",
    searchPath,
}: SearchQueryInputProps) {
    const router = useRouter();
    const pathname = usePathname();
    const searchParams = useSearchParams();
    const [value, setValue] = useState(initialValue);
    const [hasUserEdited, setHasUserEdited] = useState(false);
    const [, startTransition] = useTransition();

    useEffect(() => {
        if (!hasUserEdited) {
            return;
        }

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
    }, [
        hasUserEdited,
        pathname,
        router,
        searchParams,
        searchPath,
        startTransition,
        value,
    ]);

    return (
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
                onChange={(event) => {
                    setHasUserEdited(true);
                    setValue(event.target.value);
                }}
                placeholder={placeholder}
                value={value}
            />
        </div>
    );
}
