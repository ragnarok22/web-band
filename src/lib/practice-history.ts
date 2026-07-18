import type { PracticeSession } from "@/types/persistence";

export interface MostUsedPattern {
  durationSeconds: number;
  patternId: string;
  patternName: string;
}

export interface MostUsedBpmRange {
  durationSeconds: number;
  maximumBpm: number;
  minimumBpm: number;
}

export interface PracticeSessionDay {
  dateKey: string;
  sessions: PracticeSession[];
}

function localDateKey(timestamp: string): string {
  const date = new Date(timestamp);
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
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
  const start = new Date(now);
  const daysSinceMonday = (start.getDay() + 6) % 7;
  start.setDate(start.getDate() - daysSinceMonday);
  start.setHours(0, 0, 0, 0);
  const end = new Date(start);
  end.setDate(end.getDate() + 7);

  return sessions.reduce((total, session) => {
    const startedAt = Date.parse(session.startedAt);
    return startedAt >= start.getTime() && startedAt < end.getTime()
      ? total + session.durationSeconds
      : total;
  }, 0);
}

export function getPracticeSessionCount(
  sessions: readonly PracticeSession[],
): number {
  return sessions.length;
}

export function getMostUsedPattern(
  sessions: readonly PracticeSession[],
): MostUsedPattern | null {
  const patterns = new Map<string, MostUsedPattern>();
  for (const session of sessions) {
    const current = patterns.get(session.patternId);
    patterns.set(session.patternId, {
      durationSeconds:
        (current?.durationSeconds ?? 0) + session.durationSeconds,
      patternId: session.patternId,
      patternName: session.patternName,
    });
  }

  return (
    Array.from(patterns.values()).sort(
      (left, right) =>
        right.durationSeconds - left.durationSeconds ||
        left.patternName.localeCompare(right.patternName) ||
        left.patternId.localeCompare(right.patternId),
    )[0] ?? null
  );
}

export function getMostUsedBpmRange(
  sessions: readonly PracticeSession[],
): MostUsedBpmRange | null {
  const ranges = new Map<number, number>();
  for (const session of sessions) {
    const minimumBpm = Math.floor(session.startingBpm / 20) * 20;
    ranges.set(
      minimumBpm,
      (ranges.get(minimumBpm) ?? 0) + session.durationSeconds,
    );
  }
  const leader = Array.from(ranges.entries()).sort(
    ([leftRange, leftDuration], [rightRange, rightDuration]) =>
      rightDuration - leftDuration || leftRange - rightRange,
  )[0];
  return leader
    ? {
        durationSeconds: leader[1],
        maximumBpm: leader[0] + 19,
        minimumBpm: leader[0],
      }
    : null;
}

export function groupSessionsByLocalDay(
  sessions: readonly PracticeSession[],
): PracticeSessionDay[] {
  const groups = new Map<string, PracticeSession[]>();
  const sorted = [...sessions].sort(
    (left, right) =>
      right.startedAt.localeCompare(left.startedAt) ||
      left.id.localeCompare(right.id),
  );
  for (const session of sorted) {
    const key = localDateKey(session.startedAt);
    const group = groups.get(key);
    if (group) group.push(session);
    else groups.set(key, [session]);
  }
  return Array.from(groups, ([dateKey, groupedSessions]) => ({
    dateKey,
    sessions: groupedSessions,
  }));
}
