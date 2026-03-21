import { Card } from "@/components/ui/card";

export function EmptyState({
    title,
    description,
}: {
    title: string;
    description: string;
}) {
    return (
        <Card className="p-8 text-center">
            <h3 className="font-display text-2xl font-bold">{title}</h3>
            <p className="mx-auto mt-3 max-w-xl text-sm leading-7 text-muted-foreground">
                {description}
            </p>
        </Card>
    );
}
