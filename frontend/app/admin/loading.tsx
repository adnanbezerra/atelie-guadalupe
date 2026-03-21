import { Card } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";

export default function Loading() {
    return (
        <div className="space-y-8 p-8">
            <Skeleton className="h-4 w-28" />
            <Skeleton className="h-14 w-96" />
            <div className="grid gap-6 md:grid-cols-3">
                {Array.from({ length: 3 }).map((_, index) => (
                    <Card key={index} className="p-6">
                        <Skeleton className="h-5 w-24" />
                        <Skeleton className="mt-4 h-10 w-32" />
                    </Card>
                ))}
            </div>
        </div>
    );
}
