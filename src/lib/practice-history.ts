import { getSubdivisionLabel } from "@/lib/metronome";
import type { PracticeSession } from "@/types/persistence";

// This order also provides a deterministic tie-break for equal mode durations.
export const historyModes = [
  "drums",
  "strumming",
  "chords",
  "tempoTrainer",
  "metronome",
] as const;
export const historyModeLabels: Record<
  PracticeSession["practiceMode"],
  string
> = {
  drums: "Drums",
  strumming: "Strumming",
  chords: "Chords",
  tempoTrainer: "Tempo Trainer",
  metronome: "Metronome",
};

export type HistorySort = "newest" | "oldest" | "longest";
export interface HistoryFilterValues {
  mode: PracticeSession["practiceMode"] | "all";
  range: "7" | "30" | "all";
  sort: HistorySort;
}
export const defaultHistoryFilters: HistoryFilterValues = {
  mode: "all",
  range: "all",
  sort: "newest",
};

export interface PracticeSessionDay {
  dateKey: string;
  durationSeconds: number;
  sessions: PracticeSession[];
}
export interface HistoryActivityDay {
  date: Date;
  dateKey: string;
  durationSeconds: number;
  isToday: boolean;
}

export function formatHistoryDuration(seconds: number): string {
  if (seconds < 60) return `${seconds} sec`;
  const minutes = Math.floor(seconds / 60);
  const remainingSeconds = seconds % 60;
  if (minutes < 60)
    return `${minutes} min${remainingSeconds ? ` ${remainingSeconds} sec` : ""}`;
  const hours = Math.floor(minutes / 60);
  return [
    `${hours}h`,
    minutes % 60 ? `${minutes % 60}m` : "",
    remainingSeconds ? `${remainingSeconds}s` : "",
  ]
    .filter(Boolean)
    .join(" ");
}

function localDateKey(date: Date): string {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
}

function localDay(date: Date, offset = 0): Date {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate() + offset);
}

export function getTotalPracticeDuration(
  sessions: readonly PracticeSession[],
): number {
  return sessions.reduce(
    (total, session) => total + session.durationSeconds,
    0,
  );
}

export function getCurrentLocalWeekDuration(
  sessions: readonly PracticeSession[],
  now = new Date(),
): number {
  const start = localDay(now, -((now.getDay() + 6) % 7));
  const end = localDay(start, 7);
  return sessions.reduce((total, session) => {
    const timestamp = Date.parse(session.startedAt);
    return timestamp >= start.getTime() && timestamp < end.getTime()
      ? total + session.durationSeconds
      : total;
  }, 0);
}

export function getPracticeSessionCount(
  sessions: readonly PracticeSession[],
): number {
  return sessions.length;
}

export function getMostPracticedMode(
  sessions: readonly PracticeSession[],
): { mode: PracticeSession["practiceMode"]; durationSeconds: number } | null {
  const durations = new Map<PracticeSession["practiceMode"], number>();
  for (const session of sessions)
    durations.set(
      session.practiceMode,
      (durations.get(session.practiceMode) ?? 0) + session.durationSeconds,
    );
  let leader: ReturnType<typeof getMostPracticedMode> = null;
  for (const mode of historyModes) {
    const durationSeconds = durations.get(mode) ?? 0;
    if (durationSeconds > (leader?.durationSeconds ?? 0))
      leader = { mode, durationSeconds };
  }
  return leader;
}

/** Saved active duration belongs entirely to the session's local start day.
 * Do not split at midnight or derive duration from endpoints (which may include pauses).
 * Calendar arithmetic, rather than 24-hour offsets, preserves DST boundaries.
 */
export function getHistoryActivity(
  sessions: readonly PracticeSession[],
  now = new Date(),
): HistoryActivityDay[] {
  const days = Array.from({ length: 7 }, (_, index) => {
    const date = localDay(now, index - 6);
    return {
      date,
      dateKey: localDateKey(date),
      durationSeconds: 0,
      isToday: index === 6,
    };
  });
  const byDate = new Map(days.map((day) => [day.dateKey, day]));
  for (const session of sessions) {
    const day = byDate.get(localDateKey(new Date(session.startedAt)));
    if (day) day.durationSeconds += session.durationSeconds;
  }
  return days;
}

export function getHistoryChartScale(maximumSeconds: number): {
  maximumSeconds: number;
  label: string;
} {
  if (maximumSeconds === 0) return { maximumSeconds: 60, label: "1 min" };
  const unit = maximumSeconds >= 3600 ? 3600 : maximumSeconds >= 60 ? 60 : 1;
  const value = maximumSeconds / unit;
  const magnitude = 10 ** Math.floor(Math.log10(value));
  const maximum = Math.ceil(value / magnitude) * magnitude * unit;
  return { maximumSeconds: maximum, label: formatHistoryDuration(maximum) };
}

function compareSessions(sort: HistorySort) {
  return (left: PracticeSession, right: PracticeSession): number =>
    (sort === "longest" ? right.durationSeconds - left.durationSeconds : 0) ||
    (sort === "oldest"
      ? left.startedAt.localeCompare(right.startedAt)
      : right.startedAt.localeCompare(left.startedAt)) ||
    left.id.localeCompare(right.id);
}

export function selectHistorySessions(
  sessions: readonly PracticeSession[],
  filters: HistoryFilterValues,
  now = new Date(),
): PracticeSession[] {
  const start =
    filters.range === "all"
      ? -Infinity
      : localDay(now, 1 - Number(filters.range)).getTime();
  const end = filters.range === "all" ? Infinity : localDay(now, 1).getTime();
  return sessions
    .filter((session) => {
      const timestamp = Date.parse(session.startedAt);
      return (
        (filters.mode === "all" || session.practiceMode === filters.mode) &&
        timestamp >= start &&
        timestamp < end
      );
    })
    .sort(compareSessions(filters.sort));
}

/** For longest-first, days are ranked by their longest matching session;
 * sessions inside each day are also longest-first. Each date appears only once.
 */
export function groupSessionsByLocalDay(
  sessions: readonly PracticeSession[],
  sort: HistorySort = "newest",
): PracticeSessionDay[] {
  const groups = new Map<string, PracticeSessionDay>();
  for (const session of [...sessions].sort(compareSessions(sort))) {
    const dateKey = localDateKey(new Date(session.startedAt));
    const group = groups.get(dateKey);
    if (group) {
      group.sessions.push(session);
      group.durationSeconds += session.durationSeconds;
    } else
      groups.set(dateKey, {
        dateKey,
        durationSeconds: session.durationSeconds,
        sessions: [session],
      });
  }
  return Array.from(groups.values());
}

export function getPracticeSessionTitle(session: PracticeSession): string {
  return session.practiceMode === "drums"
    ? session.patternName
    : historyModeLabels[session.practiceMode];
}

export function getHistorySessionBpm(session: PracticeSession): string {
  return session.startingBpm === session.endingBpm
    ? `${session.startingBpm} BPM`
    : `${session.startingBpm} → ${session.endingBpm} BPM`;
}

export function getHistorySubdivision(
  session: Extract<PracticeSession, { practiceMode: "metronome" }>,
): string {
  const [numerator, denominator] = session.timeSignature.split("/").map(Number);
  return getSubdivisionLabel(session.metronome.subdivision, {
    numerator: numerator!,
    denominator: denominator!,
  });
}

export function getHistorySessionMetadata(session: PracticeSession): string {
  switch (session.practiceMode) {
    case "metronome":
      return `${getHistorySubdivision(session)}${session.metronome.trainingMode === "progressive" ? " (starting)" : ""} · ${session.timeSignature} · ${session.metronome.trainingMode === "progressive" ? "Progressive" : "Manual"}`;
    case "drums":
      return ["Drums", session.category, session.timeSignature]
        .filter(Boolean)
        .join(" · ");
    default:
      return `Drum accompaniment: ${session.patternName} · ${session.timeSignature}`;
  }
}
