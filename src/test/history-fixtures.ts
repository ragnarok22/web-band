import type { PracticeSession } from "@/types/persistence";

export function historySession(
  id: string,
  options: {
    practiceMode?: PracticeSession["practiceMode"];
    startedAt?: string;
    durationSeconds?: number;
    startingBpm?: number;
    endingBpm?: number;
    patternName?: string;
    timeSignature?: string;
    trainingMode?: "manual" | "progressive";
    subdivision?: 1 | 2 | 3 | 4;
  } = {},
): PracticeSession {
  const startedAt =
    options.startedAt ?? new Date(2026, 9, 20, 15).toISOString();
  const durationSeconds = options.durationSeconds ?? 31;
  const endedAt = new Date(
    Date.parse(startedAt) + durationSeconds * 1_000,
  ).toISOString();
  const base = {
    id,
    startedAt,
    endedAt,
    durationSeconds,
    startingBpm: options.startingBpm ?? 80,
    endingBpm: options.endingBpm ?? options.startingBpm ?? 80,
    timeSignature: options.timeSignature ?? "4/4",
    createdAt: startedAt,
    updatedAt: endedAt,
  };
  return options.practiceMode === "metronome"
    ? {
        ...base,
        practiceMode: "metronome",
        metronome: {
          trainingMode: options.trainingMode ?? "manual",
          subdivision: options.subdivision ?? 1,
        },
      }
    : {
        ...base,
        practiceMode: options.practiceMode ?? "drums",
        category: "rock",
        patternId: "basic-rock",
        patternName: options.patternName ?? "Basic Rock",
      };
}
