import { LoadingSkeleton } from "@/components/shared/loading-skeleton";
import { Skeleton } from "@/components/ui/skeleton";

const practiceModes = [
  { id: "drums", width: "w-24" },
  { id: "strumming", width: "w-32" },
  { id: "chords", width: "w-24" },
  { id: "tempoTrainer", width: "w-24" },
  { id: "metronome", width: "w-36" },
];

export function PracticeSkeleton() {
  return (
    <LoadingSkeleton
      className="mx-auto min-h-[calc(100dvh-4rem)] w-full max-w-[100rem] px-3 pb-8 sm:px-6 lg:px-8"
      label="Loading your saved practice setup…"
    >
      <div className="flex flex-wrap items-center justify-between gap-3 py-4 sm:py-5">
        <Skeleton className="h-7 w-40 sm:h-8 sm:w-48" />
        <div className="flex gap-2">
          <Skeleton className="h-11 w-20 rounded-xl" />
          <Skeleton className="h-11 w-28 rounded-xl" />
          <Skeleton className="h-11 w-11 rounded-xl sm:w-28" />
        </div>
      </div>

      <div className="flex flex-wrap gap-2">
        {practiceModes.map(({ id, width }) => (
          <Skeleton className={`h-11 rounded-xl ${width}`} key={id} />
        ))}
      </div>

      <div className="mt-5 space-y-4">
        <div className="border-border bg-surface flex flex-wrap items-center justify-between gap-x-4 gap-y-2 rounded-2xl border px-4 py-3 sm:px-5">
          <div className="min-w-0 flex-1 basis-52 space-y-1.5">
            <Skeleton className="h-3 w-24" />
            <Skeleton className="h-6 w-44" />
            <Skeleton className="h-4 w-32" />
          </div>
          <div className="flex gap-2">
            <Skeleton className="h-11 w-28 rounded-lg" />
            <Skeleton className="h-11 w-32 rounded-lg" />
          </div>
        </div>

        <div className="border-border bg-surface overflow-hidden rounded-2xl border">
          <div className="px-4 py-5 sm:px-6">
            <div className="mb-5 flex justify-between gap-3">
              <Skeleton className="h-4 w-28" />
              <Skeleton className="h-4 w-20" />
            </div>
            <div className="mx-auto grid max-w-4xl grid-cols-4 gap-4">
              {Array.from({ length: 4 }, (_, index) => (
                <div className="flex flex-col items-center gap-3" key={index}>
                  <Skeleton className="h-7 w-5" />
                  <Skeleton className="size-8 rounded-full" />
                  <Skeleton className="h-5 w-12" />
                </div>
              ))}
            </div>
          </div>
          <div className="border-border @container/transport border-t px-4 py-4 sm:px-6">
            <div className="mx-auto grid max-w-4xl grid-cols-1 items-center justify-items-center gap-3 @3xl/transport:grid-cols-[minmax(0,1fr)_auto_minmax(0,1fr)]">
              <div className="flex flex-col items-center gap-2 @3xl/transport:justify-self-start">
                <Skeleton className="h-3 w-20" />
                <Skeleton className="h-16 w-36 rounded-xl" />
                <Skeleton className="h-3 w-24" />
              </div>
              <div className="flex items-center gap-2">
                <Skeleton className="size-11 rounded-xl" />
                <Skeleton className="h-12 w-28 rounded-xl" />
                <Skeleton className="size-11 rounded-xl" />
              </div>
              <Skeleton className="h-6 w-28 @3xl/transport:justify-self-end" />
            </div>
            <div className="border-border mt-4 flex flex-wrap justify-between gap-2 border-t pt-3">
              <Skeleton className="h-11 w-44 rounded-xl" />
              <Skeleton className="h-11 w-36 rounded-xl" />
            </div>
          </div>
        </div>
      </div>
    </LoadingSkeleton>
  );
}
