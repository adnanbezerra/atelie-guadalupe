import type { HTMLAttributes, ReactNode } from "react";
import { cn } from "@/lib/utils";

export function Card({
    className,
    children,
    ...props
}: HTMLAttributes<HTMLDivElement> & { children: ReactNode }) {
    return (
        <div
            className={cn(
                "rounded-[1.5rem] border border-[color:var(--color-border)] bg-white/90 shadow-[0_20px_60px_-40px_rgba(44,31,14,0.45)] backdrop-blur",
                className,
            )}
            {...props}
        >
            {children}
        </div>
    );
}
