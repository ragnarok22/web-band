import { LoadingSkeleton } from "@/components/shared/loading-skeleton";
import { Skeleton } from "@/components/ui/skeleton";

export function EditorSkeleton() {
  return (
    <LoadingSkeleton
      className="mx-auto min-h-[calc(100dvh-4rem)] w-full max-w-[100rem] px-3 py-6 sm:px-6 lg:px-8"
      label="Setting up the pattern workshop"
    >
      <div className="border-border bg-surface mb-5 rounded-3xl border p-5 sm:p-7">
        <div className="flex flex-col gap-5 xl:flex-row xl:items-end xl:justify-between">
          <div className="min-w-0">
            <Skeleton className="mb-5 h-11 w-36" />
            <Skeleton className="h-4 w-40 max-w-full" />
            <Skeleton className="mt-2 h-10 w-80 max-w-full sm:h-12" />
            <Skeleton className="mt-3 h-14 w-lg max-w-full sm:h-7" />
          </div>
          <div className="flex flex-wrap gap-2">
            <Skeleton className="h-11 w-32 rounded-xl" />
            <Skeleton className="h-11 w-28 rounded-xl" />
            <Skeleton className="h-11 w-36 rounded-xl" />
          </div>
        </div>
      </div>

      <div className="grid gap-5">
        <div className="border-border bg-surface grid gap-4 rounded-2xl border p-4 sm:p-5">
          <div className="grid gap-4 lg:grid-cols-[1.2fr_1fr]">
            <EditorFieldSkeleton />
            <EditorFieldSkeleton />
          </div>
          <div className="space-y-2">
            <Skeleton className="h-3 w-24" />
            <Skeleton className="h-24 rounded-xl" />
          </div>
          <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
            {Array.from({ length: 4 }, (_, index) => (
              <EditorFieldSkeleton key={index} />
            ))}
          </div>
          <div className="grid gap-3 sm:grid-cols-3">
            {Array.from({ length: 3 }, (_, index) => (
              <EditorFieldSkeleton key={index} />
            ))}
          </div>
        </div>

        <div className="border-border bg-surface overflow-hidden rounded-2xl border">
          <div className="border-border flex flex-wrap items-center justify-between gap-3 border-b p-4">
            <Skeleton className="h-6 w-36" />
            <Skeleton className="h-11 w-48 rounded-xl" />
          </div>
          <div className="space-y-2 p-3 sm:p-4">
            {Array.from({ length: 11 }, (_, index) => (
              <div className="flex items-center gap-3" key={index}>
                <Skeleton className="h-4 w-24 shrink-0 sm:w-32" />
                <Skeleton className="skeleton-step-row h-11 min-w-0 flex-1 rounded-sm" />
              </div>
            ))}
          </div>
        </div>
        <div className="border-border bg-surface flex flex-wrap justify-between gap-4 rounded-2xl border p-4 sm:p-5">
          <div className="space-y-2">
            <Skeleton className="h-4 w-48" />
            <Skeleton className="h-3 w-64 max-w-full" />
          </div>
          <Skeleton className="h-11 w-32 rounded-xl" />
        </div>
      </div>
    </LoadingSkeleton>
  );
}

function EditorFieldSkeleton() {
  return (
    <div className="min-w-0 space-y-2">
      <Skeleton className="h-3 w-20 max-w-full" />
      <Skeleton className="h-11 w-full rounded-xl" />
    </div>
  );
}
