import * as React from "react";
import { cn } from "@/lib/utils";

export function Select({
    className,
    ...props
}: React.SelectHTMLAttributes<HTMLSelectElement>) {
    return (
        <select
            className={cn(
                "h-11 w-full rounded-xl border border-border bg-white/80 px-3 text-sm outline-none focus:border-primary",
                className,
            )}
            {...props}
        />
    );
}
