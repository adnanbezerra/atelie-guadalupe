import type { HTMLAttributes, ReactNode } from "react";
import { cn } from "@/lib/utils";

const tones = {
    default: "bg-primary/10 text-primary",
    muted: "bg-slate-100 text-slate-700",
    success: "bg-emerald-50 text-emerald-700",
    warning: "bg-amber-50 text-amber-700",
    danger: "bg-red-50 text-red-700",
} as const;

export function Badge({
    className,
    children,
    tone = "default",
    ...props
}: HTMLAttributes<HTMLSpanElement> & {
    children: ReactNode;
    tone?: keyof typeof tones;
}) {
    return (
        <span
            className={cn(
                "inline-flex items-center rounded-full px-3 py-1 text-[0.72rem] font-semibold uppercase tracking-[0.18em]",
                tones[tone],
                className,
            )}
            {...props}
        >
            {children}
        </span>
    );
}
