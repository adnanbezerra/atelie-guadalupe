import { Skeleton } from "@/components/ui/skeleton";

export function ProductGridSkeleton() {
    return (
        <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-3">
            {Array.from({ length: 6 }).map((_, index) => (
                <div
                    key={index}
                    className="rounded-[1.75rem] border border-white/60 bg-white/80 p-5 shadow-lg"
                >
                    <div className="grid gap-5 lg:grid-cols-[0.9fr_1.1fr]">
                        <Skeleton className="aspect-square w-full rounded-[1.5rem]" />
                        <div>
                            <Skeleton className="h-6 w-24" />
                            <Skeleton className="mt-4 h-8 w-3/4" />
                            <Skeleton className="mt-4 h-4 w-full" />
                            <Skeleton className="mt-2 h-4 w-11/12" />
                            <Skeleton className="mt-2 h-4 w-9/12" />
                            <div className="mt-4 flex gap-2">
                                <Skeleton className="h-8 w-20" />
                                <Skeleton className="h-8 w-20" />
                            </div>
                        </div>
                    </div>
                </div>
            ))}
        </div>
    );
}
