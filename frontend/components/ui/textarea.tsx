import * as React from "react";
import { cn } from "@/lib/utils";

export function Textarea({
    className,
    ...props
}: React.TextareaHTMLAttributes<HTMLTextAreaElement>) {
    return (
        <textarea
            className={cn(
                "min-h-28 w-full rounded-xl border border-border bg-white/80 px-3 py-3 text-sm outline-none placeholder:text-muted-foreground focus:border-primary",
                className,
            )}
            {...props}
        />
    );
}
