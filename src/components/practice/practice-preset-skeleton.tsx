import { LoadingSkeleton } from "@/components/shared/loading-skeleton";
import { Skeleton } from "@/components/ui/skeleton";

export function PracticePresetSkeleton() {
  return (
    <LoadingSkeleton as="div" label="Loading presets…">
      <div className="grid gap-3 sm:grid-cols-2">
        {Array.from({ length: 4 }, (_, index) => (
          <div
            className="border-border bg-surface min-w-0 space-y-3 rounded-2xl border p-4"
            key={index}
          >
            <div className="flex items-center justify-between gap-3">
              <Skeleton className="h-5 w-36 max-w-full" />
              <Skeleton className="size-8 shrink-0 rounded-lg" />
            </div>
            <Skeleton className="h-4 w-4/5" />
            <Skeleton className="h-3 w-3/5" />
            <Skeleton className="h-11 w-full rounded-xl" />
          </div>
        ))}
      </div>
    </LoadingSkeleton>
  );
}
