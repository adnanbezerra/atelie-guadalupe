import { Skeleton } from "@/components/ui/skeleton";

function HeaderSkeleton({ crafts = false }: { crafts?: boolean }) {
    return (
        <header
            className={
                crafts
                    ? "sticky top-0 z-50 border-b border-neutral-200 bg-white/80 px-4 py-4 backdrop-blur-md sm:px-6 lg:px-8"
                    : "sticky top-0 z-50 border-b border-slate-200 bg-[#f6f6f8]/80 px-6 py-4 backdrop-blur-md md:px-10"
            }
        >
            <div className="mx-auto flex max-w-7xl items-center justify-between gap-6">
                <div className="flex items-center gap-4 sm:gap-8">
                    <Skeleton
                        className={crafts ? "h-8 w-44 rounded-full" : "h-10 w-52"}
                    />
                    <div className="hidden gap-4 md:flex">
                        <Skeleton className="h-4 w-28 rounded-full" />
                        <Skeleton className="h-4 w-24 rounded-full" />
                        <Skeleton className="h-4 w-20 rounded-full" />
                    </div>
                </div>
                <div className="flex items-center gap-3">
                    <Skeleton
                        className={
                            crafts
                                ? "hidden h-10 w-56 rounded-full lg:block"
                                : "hidden h-10 w-60 rounded-lg sm:block"
                        }
                    />
                    <Skeleton className="h-10 w-10 rounded-full" />
                    <Skeleton className="h-10 w-10 rounded-full" />
                </div>
            </div>
        </header>
    );
}

export function HomePageSkeleton() {
    return (
        <div className="min-h-screen bg-[#f6f6f8]">
            <header className="sticky top-0 z-50 border-b border-slate-200 bg-[#f6f6f8]/80 px-4 py-4 backdrop-blur-md sm:px-6 lg:px-8">
                <div className="mx-auto flex max-w-7xl items-center justify-between gap-6">
                    <div className="flex items-center gap-4">
                        <Skeleton className="h-10 w-10 rounded-full" />
                        <Skeleton className="h-8 w-48" />
                    </div>
                    <div className="hidden gap-4 md:flex">
                        <Skeleton className="h-4 w-28 rounded-full" />
                        <Skeleton className="h-4 w-24 rounded-full" />
                        <Skeleton className="h-4 w-20 rounded-full" />
                    </div>
                    <div className="flex items-center gap-3">
                        <Skeleton className="hidden h-10 w-56 rounded-full lg:block" />
                        <Skeleton className="h-10 w-10 rounded-full" />
                    </div>
                </div>
            </header>

            <main>
                <section className="relative overflow-hidden px-4 py-12 sm:px-6 lg:px-8">
                    <div className="mx-auto grid max-w-7xl gap-8 lg:grid-cols-[1.2fr_0.8fr]">
                        <div className="rounded-xl border border-primary/10 bg-white/90 p-8 shadow-2xl backdrop-blur-md md:p-12">
                            <Skeleton className="h-4 w-32 rounded-full" />
                            <Skeleton className="mt-6 h-16 w-full max-w-2xl" />
                            <Skeleton className="mt-4 h-16 w-5/6 max-w-xl" />
                            <Skeleton className="mt-6 h-5 w-full max-w-2xl" />
                            <Skeleton className="mt-3 h-5 w-4/5 max-w-xl" />
                            <div className="mt-8 flex flex-col gap-4 sm:flex-row sm:justify-center">
                                <Skeleton className="h-14 w-full sm:w-56" />
                                <Skeleton className="h-14 w-full sm:w-56" />
                            </div>
                        </div>
                        <div className="grid gap-6">
                            <Skeleton className="min-h-[280px] rounded-2xl" />
                            <Skeleton className="min-h-[280px] rounded-2xl" />
                        </div>
                    </div>
                </section>

                <section className="bg-white py-20">
                    <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
                        <div className="grid gap-8 lg:grid-cols-[0.95fr_1.05fr] lg:items-center">
                            <div className="rounded-[2rem] border border-primary/10 bg-primary/5 p-8">
                                <Skeleton className="h-4 w-36 rounded-full" />
                                <Skeleton className="mt-5 h-12 w-full max-w-lg" />
                                <Skeleton className="mt-3 h-12 w-4/5 max-w-md" />
                                <div className="mt-6 space-y-3">
                                    <Skeleton className="h-5 w-full" />
                                    <Skeleton className="h-5 w-11/12" />
                                    <Skeleton className="h-5 w-4/5" />
                                </div>
                                <div className="mt-8 space-y-3">
                                    <Skeleton className="h-5 w-4/5" />
                                    <Skeleton className="h-5 w-3/4" />
                                    <Skeleton className="h-5 w-5/6" />
                                </div>
                                <Skeleton className="mt-8 h-14 w-72" />
                            </div>
                            <Skeleton className="aspect-[4/5] rounded-[2rem]" />
                        </div>
                    </div>
                </section>

                <section className="bg-primary/5 py-24">
                    <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
                        <div className="mb-12 flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
                            <div className="max-w-xl">
                                <Skeleton className="h-10 w-64" />
                                <Skeleton className="mt-4 h-5 w-full" />
                                <Skeleton className="mt-3 h-5 w-4/5" />
                            </div>
                            <Skeleton className="h-5 w-40 rounded-full" />
                        </div>
                        <div className="grid gap-8 md:grid-cols-3">
                            {Array.from({ length: 3 }).map((_, index) => (
                                <div
                                    className="overflow-hidden rounded-2xl border border-primary/5 bg-white shadow-lg"
                                    key={index}
                                >
                                    <Skeleton className="h-64 rounded-none" />
                                    <div className="space-y-4 p-6">
                                        <Skeleton className="h-7 w-40" />
                                        <Skeleton className="h-4 w-full" />
                                        <Skeleton className="h-4 w-5/6" />
                                        <Skeleton className="h-4 w-24 rounded-full" />
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                </section>
            </main>

            <footer className="border-t border-slate-200 bg-white px-4 py-10 sm:px-6 lg:px-8">
                <div className="mx-auto flex max-w-7xl flex-col gap-6 md:flex-row md:items-center md:justify-between">
                    <Skeleton className="h-4 w-64 rounded-full" />
                    <div className="flex gap-6">
                        <Skeleton className="h-4 w-24 rounded-full" />
                        <Skeleton className="h-4 w-24 rounded-full" />
                        <Skeleton className="h-4 w-20 rounded-full" />
                    </div>
                </div>
            </footer>
        </div>
    );
}

export function CatalogPageSkeleton({
    variant,
}: {
    variant: "beauty" | "crafts";
}) {
    const crafts = variant === "crafts";

    return (
        <div
            className={
                crafts
                    ? "min-h-screen bg-neutral-50 text-neutral-900"
                    : "min-h-screen bg-[#f6f6f8] text-slate-900"
            }
        >
            <HeaderSkeleton crafts={crafts} />

            <main
                className={
                    crafts
                        ? "mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8"
                        : "mx-auto w-full max-w-7xl px-6 py-8 md:px-10"
                }
            >
                <div className="mb-8 flex items-center gap-2">
                    <Skeleton className="h-4 w-14 rounded-full" />
                    <Skeleton className="h-4 w-3 rounded-full" />
                    <Skeleton className="h-4 w-28 rounded-full" />
                    <Skeleton className="h-4 w-3 rounded-full" />
                    <Skeleton className="h-4 w-20 rounded-full" />
                </div>

                <section className={crafts ? "mb-12" : "mb-12"}>
                    {crafts ? (
                        <>
                            <Skeleton className="h-12 w-full max-w-xl" />
                            <Skeleton className="mt-4 h-5 w-full max-w-3xl" />
                            <Skeleton className="mt-3 h-5 w-11/12 max-w-3xl" />
                            <Skeleton className="mt-3 h-5 w-4/5 max-w-2xl" />
                        </>
                    ) : (
                        <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
                            <div className="lg:col-span-2">
                                <Skeleton className="h-14 w-full max-w-xl" />
                                <Skeleton className="mt-4 h-5 w-full max-w-xl" />
                                <Skeleton className="mt-3 h-5 w-4/5 max-w-lg" />
                            </div>
                            <Skeleton className="aspect-[4/3] rounded-xl lg:aspect-auto lg:min-h-[280px]" />
                        </div>
                    )}
                </section>

                <div className={crafts ? "flex flex-col gap-12 lg:flex-row" : "flex flex-col gap-10 md:flex-row"}>
                    <aside className={crafts ? "w-full lg:w-64 lg:flex-shrink-0" : "w-full space-y-8 md:w-64 md:flex-shrink-0"}>
                        <div className={crafts ? "sticky top-28 space-y-8" : "space-y-8"}>
                            {Array.from({ length: 3 }).map((_, index) => (
                                <div key={index}>
                                    <Skeleton className="mb-4 h-5 w-32" />
                                    <div className="space-y-3">
                                        <Skeleton className="h-4 w-5/6 rounded-full" />
                                        <Skeleton className="h-4 w-2/3 rounded-full" />
                                        <Skeleton className="h-4 w-3/4 rounded-full" />
                                        {index === 2 ? (
                                            <Skeleton className="h-2 w-full rounded-full" />
                                        ) : null}
                                    </div>
                                </div>
                            ))}
                        </div>
                    </aside>

                    <div className="flex-1">
                        <div className="mb-6 flex items-center justify-between gap-4">
                            <Skeleton className="h-4 w-40 rounded-full" />
                            <Skeleton className="h-4 w-28 rounded-full" />
                        </div>

                        <div
                            className={
                                crafts
                                    ? "grid grid-cols-1 gap-8 md:grid-cols-2 xl:grid-cols-3"
                                    : "grid grid-cols-1 gap-8 sm:grid-cols-2 lg:grid-cols-3"
                            }
                        >
                            {Array.from({ length: 6 }).map((_, index) => (
                                <div className="group" key={index}>
                                    <Skeleton
                                        className={
                                            crafts
                                                ? "mb-4 aspect-[4/5] rounded-lg"
                                                : "mb-4 aspect-square rounded-xl"
                                        }
                                    />
                                    <Skeleton
                                        className={
                                            crafts ? "h-7 w-4/5" : "h-7 w-3/4"
                                        }
                                    />
                                    <Skeleton className="mt-3 h-4 w-full" />
                                    <Skeleton className="mt-2 h-4 w-5/6" />
                                    <div className="mt-4 flex items-center justify-between gap-4">
                                        <Skeleton className="h-6 w-24" />
                                        <Skeleton
                                            className={
                                                crafts
                                                    ? "h-10 w-28 rounded-md"
                                                    : "h-10 w-24 rounded-lg"
                                            }
                                        />
                                    </div>
                                </div>
                            ))}
                        </div>

                        {crafts ? (
                            <div className="mt-16 flex items-center justify-center gap-4">
                                <Skeleton className="h-10 w-10 rounded-full" />
                                <Skeleton className="h-10 w-10 rounded-full" />
                                <Skeleton className="h-10 w-10 rounded-full" />
                                <Skeleton className="h-10 w-10 rounded-full" />
                                <Skeleton className="h-10 w-10 rounded-full" />
                            </div>
                        ) : null}
                    </div>
                </div>
            </main>
        </div>
    );
}

export function CartPageSkeleton() {
    return (
        <div className="min-h-screen bg-[#f6f6f8] font-sans text-slate-900">
            <div className="relative flex min-h-screen w-full flex-col overflow-x-hidden">
                <header className="sticky top-0 z-50 flex items-center justify-between border-b border-slate-200 bg-white px-6 py-4 backdrop-blur-sm md:px-20">
                    <div className="flex items-center gap-4">
                        <Skeleton className="h-8 w-8 rounded-full" />
                        <Skeleton className="h-8 w-40" />
                    </div>
                    <div className="flex items-center gap-8">
                        <div className="hidden gap-6 md:flex">
                            <Skeleton className="h-4 w-12 rounded-full" />
                            <Skeleton className="h-4 w-20 rounded-full" />
                            <Skeleton className="h-4 w-12 rounded-full" />
                        </div>
                        <Skeleton className="h-10 w-10 rounded-lg" />
                    </div>
                </header>

                <main className="mx-auto w-full max-w-6xl flex-1 px-6 py-10 md:px-20">
                    <div className="mb-10">
                        <Skeleton className="h-12 w-64" />
                        <Skeleton className="mt-3 h-5 w-72" />
                    </div>

                    <div className="grid grid-cols-1 gap-12 lg:grid-cols-3">
                        <div className="flex flex-col gap-8 lg:col-span-2">
                            <div className="space-y-4">
                                <Skeleton className="h-6 w-44" />
                                {Array.from({ length: 2 }).map((_, index) => (
                                    <div
                                        className="rounded-xl border border-slate-100 bg-white p-4 shadow-sm"
                                        key={index}
                                    >
                                        <div className="flex items-center gap-4">
                                            <Skeleton className="size-20 rounded-lg" />
                                            <div className="flex-1 space-y-3">
                                                <Skeleton className="h-5 w-48" />
                                                <Skeleton className="h-3 w-32" />
                                                <Skeleton className="h-4 w-20" />
                                            </div>
                                            <Skeleton className="h-10 w-28 rounded-lg" />
                                        </div>
                                    </div>
                                ))}
                            </div>

                            <div className="space-y-4">
                                <Skeleton className="h-6 w-52" />
                                <div className="rounded-xl border border-slate-100 bg-white p-4 shadow-sm">
                                    <div className="flex items-center gap-4">
                                        <Skeleton className="size-20 rounded-lg" />
                                        <div className="flex-1 space-y-3">
                                            <Skeleton className="h-5 w-56" />
                                            <Skeleton className="h-3 w-28" />
                                            <Skeleton className="h-4 w-20" />
                                        </div>
                                        <Skeleton className="h-10 w-28 rounded-lg" />
                                    </div>
                                </div>
                            </div>
                        </div>

                        <aside className="flex flex-col gap-6">
                            <div className="rounded-2xl border border-primary/10 bg-white p-6 shadow-lg">
                                <Skeleton className="h-7 w-48" />
                                <div className="mt-6 space-y-4">
                                    <Skeleton className="h-4 w-full" />
                                    <Skeleton className="h-12 w-full rounded-lg" />
                                    <Skeleton className="h-4 w-full" />
                                </div>
                                <div className="mt-8 border-t border-slate-100 pt-4">
                                    <Skeleton className="h-8 w-36" />
                                </div>
                                <Skeleton className="mt-6 h-14 w-full rounded-xl" />
                                <Skeleton className="mt-4 h-12 w-full rounded-xl" />
                            </div>

                            <div className="rounded-xl border border-dashed border-slate-300 bg-slate-50/50 p-4">
                                <Skeleton className="h-4 w-full" />
                                <Skeleton className="mt-2 h-4 w-11/12" />
                                <Skeleton className="mt-2 h-4 w-4/5" />
                            </div>
                        </aside>
                    </div>
                </main>

                <footer className="mt-20 border-t border-slate-200 bg-white px-6 py-10 md:px-20">
                    <div className="mx-auto flex max-w-6xl flex-col gap-6 md:flex-row md:items-center md:justify-between">
                        <Skeleton className="h-4 w-72 rounded-full" />
                        <div className="flex gap-8">
                            <Skeleton className="h-4 w-28 rounded-full" />
                            <Skeleton className="h-4 w-28 rounded-full" />
                            <Skeleton className="h-4 w-16 rounded-full" />
                        </div>
                    </div>
                </footer>
            </div>
        </div>
    );
}

export function AdminPageSkeleton() {
    const chartHeights = [
        "h-10",
        "h-16",
        "h-24",
        "h-32",
        "h-40",
        "h-16",
        "h-24",
        "h-32",
        "h-40",
        "h-10",
        "h-24",
        "h-32",
    ];

    return (
        <div className="space-y-8">
            <div className="flex flex-col gap-1">
                <Skeleton className="h-10 w-72" />
                <Skeleton className="h-5 w-80" />
            </div>

            <div className="grid grid-cols-1 gap-6 md:grid-cols-3">
                {Array.from({ length: 3 }).map((_, index) => (
                    <div
                        className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm"
                        key={index}
                    >
                        <div className="mb-4 flex items-start justify-between">
                            <Skeleton className="h-10 w-10 rounded-lg" />
                            <Skeleton className="h-6 w-16 rounded-full" />
                        </div>
                        <Skeleton className="h-4 w-32" />
                        <Skeleton className="mt-3 h-8 w-28" />
                    </div>
                ))}
            </div>

            <div className="grid grid-cols-1 gap-8 lg:grid-cols-3">
                <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm lg:col-span-2">
                    <div className="mb-6 flex items-center justify-between">
                        <Skeleton className="h-6 w-44" />
                        <Skeleton className="h-8 w-32 rounded-lg" />
                    </div>
                    <div className="flex h-[250px] items-end justify-between gap-2">
                        {chartHeights.map((heightClass, index) => (
                            <Skeleton
                                className={`w-full rounded-t-sm rounded-b-none ${heightClass}`}
                                key={index}
                            />
                        ))}
                    </div>
                </div>

                <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
                    <Skeleton className="mb-6 h-6 w-40" />
                    <div className="space-y-4">
                        {Array.from({ length: 3 }).map((_, index) => (
                            <div
                                className="flex items-center gap-4 rounded-lg border border-slate-200 p-3"
                                key={index}
                            >
                                <Skeleton className="h-8 w-8 rounded-full" />
                                <div className="flex-1 space-y-2">
                                    <Skeleton className="h-4 w-4/5" />
                                    <Skeleton className="h-3 w-2/3" />
                                </div>
                            </div>
                        ))}
                    </div>
                    <Skeleton className="mt-6 h-10 w-full rounded-lg" />
                </div>
            </div>

            <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
                <div className="flex items-center justify-between border-b border-slate-200 p-6">
                    <Skeleton className="h-6 w-44" />
                    <Skeleton className="h-4 w-16 rounded-full" />
                </div>
                <div className="space-y-4 p-6">
                    {Array.from({ length: 5 }).map((_, index) => (
                        <div
                            className="grid gap-4 border-b border-slate-100 pb-4 md:grid-cols-5"
                            key={index}
                        >
                            <Skeleton className="h-4 w-20" />
                            <Skeleton className="h-4 w-24" />
                            <Skeleton className="h-4 w-20" />
                            <Skeleton className="h-6 w-24 rounded-full" />
                            <Skeleton className="h-4 w-16" />
                        </div>
                    ))}
                </div>
            </div>
        </div>
    );
}
