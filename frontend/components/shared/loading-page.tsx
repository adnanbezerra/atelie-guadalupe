import { Card } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";

export function LoadingPage({ title }: { title: string }) {
    return (
        <section className="mx-auto max-w-7xl px-4 py-16 sm:px-6 lg:px-8">
            <div className="max-w-3xl">
                <Skeleton className="h-4 w-32" />
                <Skeleton className="mt-4 h-14 w-3/4" />
                <Skeleton className="mt-5 h-6 w-full" />
            </div>
            <div className="mt-10 grid gap-6 md:grid-cols-2 xl:grid-cols-3">
                {Array.from({ length: 6 }).map((_, index) => (
                    <Card
                        key={`${title}-${index}`}
                        className="overflow-hidden p-0"
                    >
                        <Skeleton className="aspect-[4/5] rounded-none" />
                        <div className="space-y-4 p-5">
                            <Skeleton className="h-5 w-28" />
                            <Skeleton className="h-6 w-4/5" />
                            <Skeleton className="h-16 w-full" />
                        </div>
                    </Card>
                ))}
            </div>
        </section>
    );
}
