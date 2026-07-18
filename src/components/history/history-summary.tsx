import {
  CalendarDays,
  Clock3,
  Gauge,
  Music2,
  NotebookTabs,
} from "lucide-react";

import {
  getCurrentLocalWeekDuration,
  getMostUsedBpmRange,
  getMostUsedPattern,
  getPracticeSessionCount,
  getTotalPracticeDuration,
} from "@/lib/practice-history";
import type { PracticeSession } from "@/types/persistence";

interface HistorySummaryProps {
  sessions: readonly PracticeSession[];
}

export function formatHistoryDuration(seconds: number): string {
  if (seconds > 0 && seconds < 60) return `${seconds} sec`;
  const minutes = Math.floor(seconds / 60);
  const hours = Math.floor(minutes / 60);
  const remainingMinutes = minutes % 60;
  if (hours === 0) return `${minutes} min`;
  return remainingMinutes === 0
    ? `${hours}h`
    : `${hours}h ${remainingMinutes}m`;
}

export function HistorySummary({ sessions }: HistorySummaryProps) {
  const pattern = getMostUsedPattern(sessions);
  const bpmRange = getMostUsedBpmRange(sessions);
  const summaries = [
    {
      detail: "All saved practice",
      icon: Clock3,
      label: "Total time",
      value: formatHistoryDuration(getTotalPracticeDuration(sessions)),
    },
    {
      detail: "Since Monday",
      icon: CalendarDays,
      label: "This week",
      value: formatHistoryDuration(getCurrentLocalWeekDuration(sessions)),
    },
    {
      detail: "Local entries",
      icon: NotebookTabs,
      label: "Sessions",
      value: String(getPracticeSessionCount(sessions)),
    },
    {
      detail: pattern
        ? `${formatHistoryDuration(pattern.durationSeconds)} saved`
        : "No pattern yet",
      icon: Music2,
      label: "Most used pattern",
      value: pattern?.patternName ?? "None yet",
    },
    {
      detail: bpmRange
        ? `${formatHistoryDuration(bpmRange.durationSeconds)} saved`
        : "No tempo yet",
      icon: Gauge,
      label: "Most used range",
      value: bpmRange
        ? `${bpmRange.minimumBpm}-${bpmRange.maximumBpm} BPM`
        : "None yet",
    },
  ];

  return (
    <section aria-labelledby="history-summary-heading">
      <div className="flex items-end justify-between gap-4">
        <div>
          <p className="text-accent text-xs font-extrabold tracking-[0.18em] uppercase">
            At a glance
          </p>
          <h2
            className="mt-2 text-2xl font-black tracking-[-0.04em] sm:text-3xl"
            id="history-summary-heading"
          >
            Your local rhythm
          </h2>
        </div>
        <p className="text-muted hidden max-w-sm text-right text-xs leading-5 sm:block">
          These summaries reflect only practice saved on this device. They are a
          personal journal, not professional analytics.
        </p>
      </div>

      <div className="mt-5 grid gap-3 sm:grid-cols-2 xl:grid-cols-5">
        {summaries.map(({ detail, icon: Icon, label, value }, index) => (
          <dl
            className={`border-border bg-surface relative overflow-hidden rounded-2xl border p-5 ${index === 0 ? "sm:col-span-2 xl:col-span-1" : ""}`}
            key={label}
          >
            <dt className="text-muted text-xs font-extrabold tracking-[0.12em] uppercase">
              <span className="bg-accent/8 text-accent absolute -top-5 -right-5 flex size-20 items-end justify-start rounded-full p-4">
                <Icon aria-hidden="true" className="size-5" />
              </span>
              {label}
            </dt>
            <dd className="text-foreground mt-6 text-2xl leading-tight font-black tracking-[-0.04em] [overflow-wrap:anywhere] break-words">
              {value}
            </dd>
            <dd className="text-muted mt-2 text-xs font-semibold">{detail}</dd>
          </dl>
        ))}
      </div>
      <p className="text-muted mt-4 text-xs leading-5 sm:hidden">
        These summaries reflect only practice saved on this device. They are a
        personal journal, not professional analytics.
      </p>
    </section>
  );
}
