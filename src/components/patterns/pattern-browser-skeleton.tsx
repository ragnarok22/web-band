import { LoadingSkeleton } from "@/components/shared/loading-skeleton";
import { Skeleton } from "@/components/ui/skeleton";

export function PatternBrowserSkeleton() {
  return (
    <LoadingSkeleton
      className="mx-auto min-h-[calc(100dvh-4rem)] w-full max-w-[100rem] px-3 py-6 sm:px-6 lg:px-8"
      label="Loading your groove library"
    >
      <div className="mb-6 flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
        <div className="space-y-3">
          <Skeleton className="h-4 w-32" />
          <Skeleton className="h-10 w-64 max-w-full sm:h-12 sm:w-80" />
          <Skeleton className="h-5 w-lg max-w-full" />
        </div>
        <div className="flex gap-2">
          <Skeleton className="h-11 w-40 rounded-xl" />
          <Skeleton className="h-11 w-28 rounded-xl" />
        </div>
      </div>

      <div className="border-border mb-5 space-y-3 border-b pb-4">
        <Skeleton className="h-12 w-full rounded-lg" />
        <div className="flex flex-wrap justify-between gap-2">
          <div className="flex flex-wrap gap-1">
            {Array.from({ length: 6 }, (_, index) => (
              <Skeleton className="h-11 w-20 rounded-full" key={index} />
            ))}
          </div>
          <Skeleton className="h-11 w-24 rounded-lg" />
        </div>
      </div>
      <Skeleton className="mb-3 h-5 w-32" />

      <div className="grid min-w-0 grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
        {Array.from({ length: 6 }, (_, index) => (
          <div
            className="border-border bg-surface min-w-0 rounded-xl border p-4"
            key={index}
          >
            <div className="mb-2 flex h-11 items-center justify-between gap-3">
              <Skeleton className="h-4 w-32" />
              <Skeleton className="size-8 rounded-lg" />
            </div>
            <Skeleton className="h-7 w-3/4" />
            <div className="mt-2 space-y-2">
              <Skeleton className="h-3 w-full" />
              <Skeleton className="h-3 w-4/5" />
            </div>
            <div className="my-3 flex h-9 items-center justify-between">
              <Skeleton className="h-4 w-24" />
              <Skeleton className="h-9 w-20 rounded-lg" />
            </div>
            <Skeleton className="h-14 w-full rounded-lg" />
            <div className="mt-4 grid grid-cols-2 gap-2">
              <Skeleton className="h-11 rounded-xl" />
              <Skeleton className="h-11 rounded-xl" />
            </div>
          </div>
        ))}
      </div>
    </LoadingSkeleton>
  );
}
