import Link from "next/link";
import { cn } from "@/lib/utils";

export function Logo({
    href = "/",
    compact = false,
    className,
}: {
    href?: string;
    compact?: boolean;
    className?: string;
}) {
    return (
        <Link
            className={cn("inline-flex items-center gap-3", className)}
            href={href}
        >
            <span className="flex size-11 items-center justify-center rounded-2xl bg-[var(--color-primary)] text-white shadow-[0_16px_40px_-18px_rgba(153,102,51,0.8)]">
                ✶
            </span>
            <span className="flex flex-col">
                <span className="font-display text-2xl font-semibold tracking-tight text-[var(--color-primary)]">
                    Ateliê Guadalupe
                </span>
                {!compact ? (
                    <span className="text-[0.65rem] uppercase tracking-[0.34em] text-[var(--color-muted)]">
                        Beleza Natural e Artes Sacras
                    </span>
                ) : null}
            </span>
        </Link>
    );
}
