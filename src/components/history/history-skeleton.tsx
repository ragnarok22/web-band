import { LoadingSkeleton } from "@/components/shared/loading-skeleton";
import { Skeleton } from "@/components/ui/skeleton";

export function HistorySkeleton() {
  return (
    <LoadingSkeleton
      className="mx-auto min-h-[calc(100dvh-4rem)] w-full max-w-[100rem] px-3 py-6 sm:px-6 lg:px-8"
      label="Opening your practice journal"
    >
      <div className="mb-6 flex items-start justify-between gap-3">
        <div className="min-w-0 space-y-3">
          <Skeleton className="h-8 w-52 max-w-full sm:h-9 sm:w-64" />
          <Skeleton className="h-5 w-60 max-w-full" />
        </div>
        <Skeleton className="size-11 shrink-0 rounded-lg sm:w-24" />
      </div>

      <div className="space-y-7">
        <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
          {Array.from({ length: 4 }, (_, index) => (
            <div
              className="border-border bg-surface min-w-0 rounded-xl border p-4 sm:p-5"
              key={index}
            >
              <Skeleton className="h-3 w-24 max-w-full" />
              <Skeleton className="mt-4 h-7 w-20 max-w-full" />
              <Skeleton className="mt-2 h-3 w-28 max-w-full" />
            </div>
          ))}
        </div>

        <div>
          <Skeleton className="mb-3 h-4 w-32" />
          <div className="border-border bg-surface rounded-xl border p-4 sm:p-5">
            <Skeleton className="mb-4 h-6 w-48 max-w-full" />
            <Skeleton className="h-40 w-full rounded-lg sm:h-44" />
          </div>
        </div>

        <div className="space-y-3">
          <Skeleton className="h-4 w-32" />
          <div className="flex flex-wrap gap-2">
            <Skeleton className="h-11 w-36 rounded-lg" />
            <Skeleton className="h-11 w-36 rounded-lg" />
          </div>
          {Array.from({ length: 3 }, (_, index) => (
            <div
              className="border-border bg-surface flex items-center justify-between gap-4 rounded-xl border p-4"
              key={index}
            >
              <div className="min-w-0 space-y-2">
                <Skeleton className="h-5 w-48 max-w-full" />
                <Skeleton className="h-3 w-64 max-w-full" />
              </div>
              <Skeleton className="size-11 shrink-0 rounded-lg" />
            </div>
          ))}
        </div>
      </div>
    </LoadingSkeleton>
  );
}
