import {
  formatHistoryDuration,
  getCurrentLocalWeekDuration,
  getMostPracticedMode,
  getPracticeSessionCount,
  getTotalPracticeDuration,
  historyModeLabels,
} from "@/lib/practice-history";
import type { PracticeSession } from "@/types/persistence";

export function HistorySummary({
  sessions,
  now,
}: {
  sessions: readonly PracticeSession[];
  now: Date;
}) {
  const mode = getMostPracticedMode(sessions);
  const summaries = [
    {
      label: "Total practice",
      value: formatHistoryDuration(getTotalPracticeDuration(sessions)),
      detail: "All saved sessions",
    },
    {
      label: "This week",
      value: formatHistoryDuration(getCurrentLocalWeekDuration(sessions, now)),
      detail: "Since Monday",
    },
    {
      label: "Sessions",
      value: String(getPracticeSessionCount(sessions)),
      detail: "Saved on this device",
    },
    {
      label: "Most practiced mode",
      value: mode ? historyModeLabels[mode.mode] : "—",
      detail: "By saved duration",
    },
  ];
  return (
    <section
      aria-label="Practice overview"
      className="grid grid-cols-2 gap-3 lg:grid-cols-4"
    >
      {summaries.map(({ label, value, detail }) => (
        <dl
          className="border-border bg-surface min-w-0 rounded-xl border p-4 sm:p-5"
          key={label}
        >
          <dt className="text-muted-foreground min-h-8 text-xs font-semibold sm:min-h-5">
            {label}
          </dt>
          <dd className="text-foreground mt-2 text-xl leading-tight font-extrabold tracking-tight break-words tabular-nums sm:text-2xl">
            {value}
          </dd>
          <dd className="text-muted-foreground mt-2 text-xs">{detail}</dd>
        </dl>
      ))}
    </section>
  );
}
