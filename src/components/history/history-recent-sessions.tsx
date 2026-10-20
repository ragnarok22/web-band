"use client";

import { useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { HistoryFilters } from "@/components/history/history-filters";
import { HistorySessionList } from "@/components/history/history-session-list";
import {
  defaultHistoryFilters,
  groupSessionsByLocalDay,
  selectHistorySessions,
  type HistoryFilterValues,
} from "@/lib/practice-history";
import type { PracticeSession } from "@/types/persistence";

const pageSize = 30;

export function HistoryRecentSessions({
  sessions,
  now,
  filters,
  onFiltersChange,
  onDelete,
}: {
  sessions: readonly PracticeSession[];
  now: Date;
  filters: HistoryFilterValues;
  onFiltersChange: (value: HistoryFilterValues) => void;
  onDelete: (session: PracticeSession, trigger: HTMLElement | null) => void;
}) {
  const [visibleCount, setVisibleCount] = useState(pageSize);
  const matchingSessions = useMemo(
    () => selectHistorySessions(sessions, filters, now),
    [sessions, filters, now],
  );
  const groups = useMemo(
    () => groupSessionsByLocalDay(matchingSessions, filters.sort),
    [matchingSessions, filters.sort],
  );

  function changeFilters(value: HistoryFilterValues): void {
    onFiltersChange(value);
    setVisibleCount(pageSize);
  }

  return (
    <section aria-labelledby="recent-sessions-heading">
      <h2
        className="text-muted-strong text-xs font-extrabold tracking-wider uppercase"
        id="recent-sessions-heading"
      >
        Recent sessions
      </h2>
      <HistoryFilters
        count={matchingSessions.length}
        onChange={changeFilters}
        value={filters}
      />
      {matchingSessions.length === 0 ? (
        <div className="border-border mt-5 rounded-xl border px-5 py-8 text-center">
          <h3 className="text-lg font-extrabold">No matching sessions</h3>
          <p className="text-muted-foreground mt-2 text-sm">
            Try a different mode or date range.
          </p>
          <Button
            className="mt-4 min-h-11"
            onClick={() => changeFilters(defaultHistoryFilters)}
            variant="outline"
          >
            Clear filters
          </Button>
        </div>
      ) : (
        <>
          <HistorySessionList
            groups={groups}
            onDelete={onDelete}
            visibleCount={visibleCount}
          />
          {matchingSessions.length > pageSize ? (
            <div className="mt-5 flex flex-wrap items-center justify-between gap-3">
              <p aria-live="polite" className="text-muted-foreground text-xs">
                Showing {Math.min(visibleCount, matchingSessions.length)} of{" "}
                {matchingSessions.length} sessions
              </p>
              {visibleCount < matchingSessions.length ? (
                <Button
                  className="min-h-11"
                  onClick={() => setVisibleCount((count) => count + pageSize)}
                  variant="outline"
                >
                  Show more sessions
                </Button>
              ) : null}
            </div>
          ) : null}
        </>
      )}
    </section>
  );
}
