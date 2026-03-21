import { Skeleton } from "@/components/ui/skeleton";

export function ProductShelfSkeleton() {
    return (
        <section className="px-4 pb-16 sm:px-6 lg:px-8">
            <div className="mx-auto max-w-7xl">
                <Skeleton className="h-8 w-64" />
                <Skeleton className="mt-3 h-5 w-96 max-w-full" />
                <div className="mt-8 grid gap-5 md:grid-cols-2 xl:grid-cols-4">
                    {Array.from({ length: 4 }).map((_, index) => (
                        <div
                            key={index}
                            className="rounded-[1.75rem] border border-white/60 bg-white/80 p-4"
                        >
                            <Skeleton className="aspect-[4/4.6] w-full rounded-[1.5rem]" />
                            <Skeleton className="mt-4 h-4 w-24" />
                            <Skeleton className="mt-3 h-6 w-3/4" />
                            <Skeleton className="mt-3 h-4 w-full" />
                            <Skeleton className="mt-2 h-4 w-2/3" />
                        </div>
                    ))}
                </div>
            </div>
        </section>
    );
}
