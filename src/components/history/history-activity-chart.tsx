"use client";

import { useId, useMemo, useSyncExternalStore } from "react";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import {
  formatHistoryDuration,
  getHistoryChartScale,
  type HistoryActivityDay,
} from "@/lib/practice-history";

const defaultLocale = new Intl.DateTimeFormat().resolvedOptions();

function subscribeToStaticLocale() {
  // Match the original module-scoped formatters: defaults stay fixed.
  return () => undefined;
}

function getLocaleSnapshot() {
  return defaultLocale;
}

export function HistoryActivityChart({
  days,
}: {
  days: readonly HistoryActivityDay[];
}) {
  const id = useId();
  // Browser defaults are unavailable during SSR and the initial hydration pass.
  const localFormat = useSyncExternalStore(
    subscribeToStaticLocale,
    getLocaleSnapshot,
    () => null,
  );
  const formatters = useMemo(() => {
    if (!localFormat) return null;
    const { locale, timeZone } = localFormat;
    return {
      day: new Intl.DateTimeFormat(locale, { weekday: "short", timeZone }),
      date: new Intl.DateTimeFormat(locale, {
        weekday: "long",
        month: "long",
        day: "numeric",
        year: "numeric",
        timeZone,
      }),
    };
  }, [localFormat]);
  const scale = getHistoryChartScale(
    Math.max(...days.map((day) => day.durationSeconds)),
  );
  const total = days.reduce((sum, day) => sum + day.durationSeconds, 0);
  const activeDays = days.filter((day) => day.durationSeconds > 0).length;
  return (
    <section aria-labelledby={`${id}-heading`}>
      <div className="mb-3 flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1">
        <h2
          className="text-muted-strong text-xs font-extrabold tracking-wider uppercase"
          id={`${id}-heading`}
        >
          Practice activity
        </h2>
        <p className="text-muted-foreground text-xs">
          Last 7 days · including today
        </p>
      </div>
      <figure
        aria-describedby={`${id}-caption`}
        className="border-border bg-surface rounded-xl border p-4 sm:p-5"
      >
        <div className="mb-4 flex flex-wrap items-baseline gap-x-3 gap-y-1">
          <p className="text-lg font-extrabold tabular-nums">
            {formatHistoryDuration(total)}
          </p>
          <p className="text-muted-foreground text-xs">
            {activeDays} of 7 days practiced
          </p>
        </div>
        <div className="grid grid-cols-[3rem_minmax(0,1fr)] gap-2">
          <div
            aria-hidden="true"
            className="text-muted-foreground flex h-32 flex-col justify-between text-[0.65rem] tabular-nums sm:h-36"
          >
            <span>{scale.label}</span>
            <span>0</span>
          </div>
          <div className="grid min-w-0 grid-cols-7 gap-1 sm:gap-3">
            {days.map((day) => {
              const label = `${formatters?.date.format(day.date) ?? day.dateKey}${day.isToday ? " (today)" : ""}: ${formatHistoryDuration(day.durationSeconds)}`;
              return (
                <Tooltip key={day.dateKey}>
                  <TooltipTrigger
                    aria-label={label}
                    role="img"
                    className="group flex min-w-0 flex-col rounded-md outline-offset-2"
                    render={<div />}
                  >
                    <div
                      aria-hidden="true"
                      className="border-border flex h-32 w-full items-end justify-center border-b px-1 sm:h-36 sm:px-2"
                    >
                      <span
                        className={`w-full max-w-10 rounded-t-sm ${day.isToday ? "bg-primary" : "bg-primary/55 group-hover:bg-primary/75 group-focus-visible:bg-primary/75"}`}
                        data-history-bar={day.dateKey}
                        style={{
                          height: `${(day.durationSeconds / scale.maximumSeconds) * 100}%`,
                        }}
                      />
                    </div>
                    <span
                      aria-hidden="true"
                      className={`mt-2 text-center text-[0.65rem] font-semibold sm:text-xs ${day.isToday ? "text-primary" : "text-muted-foreground"}`}
                    >
                      {formatters?.day.format(day.date) ?? "\u00a0"}
                    </span>
                    <span
                      aria-hidden="true"
                      className="text-primary mt-0.5 h-3 text-center text-[0.6rem]"
                    >
                      {day.isToday ? "Today" : ""}
                    </span>
                  </TooltipTrigger>
                  <TooltipContent role="tooltip">{label}</TooltipContent>
                </Tooltip>
              );
            })}
          </div>
        </div>
        <figcaption
          className="text-muted-foreground mt-3 text-xs leading-5"
          id={`${id}-caption`}
        >
          {total === 0 ? "No saved practice in the last seven days. " : ""}Time
          is counted on the local day each session started.
        </figcaption>
      </figure>
    </section>
  );
}
