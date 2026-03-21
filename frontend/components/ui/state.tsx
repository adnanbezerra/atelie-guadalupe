import type { ReactNode } from "react";
import { Card } from "@/components/ui/card";

export function EmptyState({
    title,
    description,
    action,
}: {
    title: string;
    description: string;
    action?: ReactNode;
}) {
    return (
        <Card className="p-8 text-center">
            <p className="text-sm font-semibold uppercase tracking-[0.3em] text-[var(--color-primary)]">
                Estado Vazio
            </p>
            <h3 className="mt-3 font-display text-3xl font-semibold text-[var(--color-foreground)]">
                {title}
            </h3>
            <p className="mx-auto mt-3 max-w-2xl text-sm text-[var(--color-muted)]">
                {description}
            </p>
            {action ? (
                <div className="mt-6 flex justify-center">{action}</div>
            ) : null}
        </Card>
    );
}

export function ErrorState({
    title,
    description,
}: {
    title: string;
    description: string;
}) {
    return (
        <Card className="border-rose-200 bg-rose-50/90 p-6 text-rose-900">
            <h3 className="font-display text-2xl font-semibold">{title}</h3>
            <p className="mt-2 text-sm text-rose-800/85">{description}</p>
        </Card>
    );
}
