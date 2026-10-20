import { LoadingSkeleton } from "@/components/shared/loading-skeleton";
import { Skeleton } from "@/components/ui/skeleton";

const settingsSections = [
  { id: "appearance", rows: 4 },
  { id: "practice-defaults", rows: 4 },
  { id: "sound", rows: 2 },
  { id: "history", rows: 2 },
];

export function SettingsSkeleton() {
  return (
    <LoadingSkeleton
      className="mx-auto min-h-[calc(100dvh-4rem)] w-full max-w-[70rem] px-4 py-6 sm:px-6 sm:py-8"
      label="Opening settings"
    >
      <div className="mb-6 space-y-3">
        <Skeleton className="h-9 w-32" />
        <Skeleton className="h-5 w-lg max-w-full" />
      </div>

      <div className="grid items-start gap-4 sm:gap-5 md:grid-cols-2">
        {settingsSections.map(({ id, rows }) => (
          <div
            className="border-border bg-surface min-w-0 space-y-5 rounded-2xl border p-4 sm:p-5"
            key={id}
          >
            <div className="space-y-2">
              <Skeleton className="h-6 w-40 max-w-full" />
              <Skeleton className="h-4 w-full" />
            </div>
            {Array.from({ length: rows }, (_, row) => (
              <div className="space-y-2" key={row}>
                <Skeleton className="h-4 w-32 max-w-full" />
                <Skeleton className="h-11 w-full rounded-lg" />
              </div>
            ))}
          </div>
        ))}
      </div>

      <div className="mt-7 space-y-3">
        <Skeleton className="h-5 w-36" />
        <div className="border-border bg-surface space-y-4 rounded-2xl border p-4 sm:p-5">
          <Skeleton className="h-5 w-48 max-w-full" />
          <Skeleton className="h-4 w-80 max-w-full" />
          <div className="flex flex-wrap gap-2">
            <Skeleton className="h-11 w-36 rounded-xl" />
            <Skeleton className="h-11 w-36 rounded-xl" />
          </div>
        </div>
      </div>
    </LoadingSkeleton>
  );
}
