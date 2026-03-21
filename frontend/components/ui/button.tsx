import type { ButtonHTMLAttributes, ReactNode } from "react";
import { cn } from "@/lib/utils";

type ButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & {
    variant?:
        | "primary"
        | "secondary"
        | "ghost"
        | "outline"
        | "destructive"
        | "danger";
    size?: "sm" | "md" | "lg";
    children: ReactNode;
};

const variants = {
    primary:
        "bg-[var(--color-primary)] text-white shadow-[0_10px_30px_-14px_rgba(153,102,51,0.9)] hover:brightness-110",
    secondary:
        "bg-white/85 text-[var(--color-primary)] border border-[color:var(--color-primary-soft)] hover:bg-[var(--color-surface-alt)]",
    ghost: "bg-transparent text-[var(--color-foreground)] hover:bg-[var(--color-surface-alt)]",
    outline:
        "border border-[color:var(--color-border)] bg-white text-[var(--color-foreground)] hover:bg-[var(--color-surface-alt)]",
    destructive: "bg-rose-600 text-white hover:bg-rose-700",
    danger: "bg-rose-600 text-white hover:bg-rose-700",
};

const sizes = {
    sm: "h-9 px-3 text-sm",
    md: "h-11 px-5 text-sm",
    lg: "h-12 px-6 text-base",
};

export function Button({
    className,
    variant = "primary",
    size = "md",
    children,
    ...props
}: ButtonProps) {
    return (
        <button
            className={cn(
                "inline-flex items-center justify-center gap-2 rounded-xl font-semibold transition disabled:cursor-not-allowed disabled:opacity-50",
                variants[variant],
                sizes[size],
                className,
            )}
            {...props}
        >
            {children}
        </button>
    );
}
