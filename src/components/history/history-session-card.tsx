import { Clock3, Gauge, Trash2 } from "lucide-react";

import type { PracticeSession } from "@/types/persistence";

interface HistorySessionCardProps {
  onDelete: (session: PracticeSession) => void;
  session: PracticeSession;
}

const modeLabels: Record<PracticeSession["practiceMode"], string> = {
  chords: "Chord practice",
  drums: "Drum groove",
  strumming: "Strumming",
  tempoTrainer: "Tempo trainer",
};

function formatSessionDuration(seconds: number): string {
  const minutes = Math.floor(seconds / 60);
  const remainingSeconds = seconds % 60;
  if (minutes === 0) return `${remainingSeconds} sec`;
  return remainingSeconds === 0
    ? `${minutes} min`
    : `${minutes} min ${remainingSeconds} sec`;
}

export function HistorySessionCard({
  onDelete,
  session,
}: HistorySessionCardProps) {
  const time = new Intl.DateTimeFormat(undefined, {
    hour: "numeric",
    minute: "2-digit",
  }).format(new Date(session.startedAt));
  const bpm =
    session.startingBpm === session.endingBpm
      ? `${session.startingBpm} BPM`
      : `${session.startingBpm} to ${session.endingBpm} BPM`;

  return (
    <article className="border-border bg-surface/80 hover:border-border-strong group grid gap-4 rounded-2xl border p-4 transition-colors sm:grid-cols-[minmax(0,1fr)_auto] sm:items-center sm:p-5">
      <div className="min-w-0">
        <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
          <p className="text-accent text-xs font-extrabold tracking-[0.12em] uppercase">
            {time}
          </p>
          <span className="text-muted text-xs font-semibold">
            {modeLabels[session.practiceMode]}
          </span>
        </div>
        <h3 className="text-foreground mt-2 truncate text-xl font-black tracking-[-0.035em]">
          {session.patternName}
        </h3>
        <p className="text-muted mt-1 text-sm capitalize">
          {session.category} · {session.timeSignature}
        </p>
      </div>

      <div className="flex items-center justify-between gap-3 sm:justify-end">
        <div className="text-muted-strong flex flex-wrap items-center gap-3 text-sm font-bold">
          <span className="flex items-center gap-1.5">
            <Clock3 aria-hidden="true" className="text-muted size-4" />
            {formatSessionDuration(session.durationSeconds)}
          </span>
          <span className="flex items-center gap-1.5">
            <Gauge aria-hidden="true" className="text-muted size-4" />
            {bpm}
          </span>
        </div>
        <button
          aria-label={`Delete ${session.patternName} session`}
          className="border-border text-muted hover:border-danger/40 hover:bg-danger/10 hover:text-danger flex size-11 shrink-0 items-center justify-center rounded-xl border transition-colors"
          onClick={() => onDelete(session)}
          type="button"
        >
          <Trash2 aria-hidden="true" className="size-4" />
        </button>
      </div>
    </article>
  );
}
