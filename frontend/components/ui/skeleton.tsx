import { cn } from "@/lib/utils";

export function Skeleton({ className }: { className?: string }) {
    return (
        <div
            className={cn(
                "animate-pulse rounded-2xl bg-[linear-gradient(90deg,rgba(214,198,170,0.18),rgba(214,198,170,0.4),rgba(214,198,170,0.18))]",
                className,
            )}
        />
    );
}
