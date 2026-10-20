import { HistorySessionCard } from "@/components/history/history-session-card";
import {
  formatHistoryDuration,
  type PracticeSessionDay,
} from "@/lib/practice-history";
import type { PracticeSession } from "@/types/persistence";

const dateFormatter = new Intl.DateTimeFormat(undefined, {
  weekday: "long",
  month: "long",
  day: "numeric",
  year: "numeric",
});

export function HistorySessionList({
  groups,
  visibleCount,
  onDelete,
}: {
  groups: readonly PracticeSessionDay[];
  visibleCount: number;
  onDelete: (session: PracticeSession, trigger: HTMLElement | null) => void;
}) {
  let remaining = visibleCount;
  const visibleGroups = [];
  for (const group of groups) {
    if (remaining <= 0) break;
    const visible = group.sessions.slice(0, remaining);
    visibleGroups.push({ group, visible });
    remaining -= visible.length;
  }
  return (
    <div className="mt-5 space-y-6">
      {visibleGroups.map(({ group, visible }) => {
        return (
          <section
            aria-labelledby={`history-day-${group.dateKey}`}
            key={group.dateKey}
          >
            <div className="mb-3 flex flex-wrap items-center gap-x-3 gap-y-1">
              <h3
                className="text-muted-strong text-sm font-bold"
                id={`history-day-${group.dateKey}`}
              >
                {dateFormatter.format(new Date(group.sessions[0]!.startedAt))}
              </h3>
              <span
                aria-hidden="true"
                className="bg-border h-px min-w-4 flex-1"
              />
              <p className="text-muted-foreground text-xs">
                {group.sessions.length}{" "}
                {group.sessions.length === 1 ? "session" : "sessions"} ·{" "}
                {formatHistoryDuration(group.durationSeconds)}
              </p>
            </div>
            <ul className="space-y-2">
              {visible.map((session) => (
                <li
                  className="[contain-intrinsic-size:auto_9rem] [content-visibility:auto]"
                  key={session.id}
                >
                  <HistorySessionCard session={session} onDelete={onDelete} />
                </li>
              ))}
            </ul>
          </section>
        );
      })}
    </div>
  );
}
