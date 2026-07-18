import { HistorySessionCard } from "@/components/history/history-session-card";
import { groupSessionsByLocalDay } from "@/lib/practice-history";
import type { PracticeSession } from "@/types/persistence";

interface HistorySessionListProps {
  onDelete: (session: PracticeSession) => void;
  sessions: readonly PracticeSession[];
}

export function HistorySessionList({
  onDelete,
  sessions,
}: HistorySessionListProps) {
  const groups = groupSessionsByLocalDay(sessions);

  return (
    <div className="mt-6 space-y-8">
      {groups.map((group) => {
        const date = new Intl.DateTimeFormat(undefined, {
          day: "numeric",
          month: "long",
          weekday: "long",
          year: "numeric",
        }).format(new Date(group.sessions[0]!.startedAt));
        return (
          <section
            aria-labelledby={`history-day-${group.dateKey}`}
            key={group.dateKey}
          >
            <div className="mb-3 flex items-center gap-3">
              <h3
                className="text-muted-strong text-sm font-extrabold"
                id={`history-day-${group.dateKey}`}
              >
                {date}
              </h3>
              <span aria-hidden="true" className="bg-border h-px flex-1" />
            </div>
            <ul className="space-y-3">
              {group.sessions.map((session) => (
                <li
                  className="[contain-intrinsic-size:auto_8rem] [content-visibility:auto]"
                  key={session.id}
                >
                  <HistorySessionCard onDelete={onDelete} session={session} />
                </li>
              ))}
            </ul>
          </section>
        );
      })}
    </div>
  );
}
