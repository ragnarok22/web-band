import type { HistorySettings } from "@/types/persistence";

export const MIN_HISTORY_MINIMUM_DURATION_SECONDS = 1;
export const MAX_HISTORY_MINIMUM_DURATION_SECONDS = 3_600;
export const DEFAULT_HISTORY_MINIMUM_DURATION_SECONDS = 30;

export const defaultHistorySettings: HistorySettings = {
  enabled: true,
  minimumDurationSeconds: DEFAULT_HISTORY_MINIMUM_DURATION_SECONDS,
};

export function isHistoryMinimumDurationSeconds(
  value: unknown,
): value is number {
  return (
    typeof value === "number" &&
    Number.isInteger(value) &&
    value >= MIN_HISTORY_MINIMUM_DURATION_SECONDS &&
    value <= MAX_HISTORY_MINIMUM_DURATION_SECONDS
  );
}

export function clampHistoryMinimumDurationSeconds(value: number): number {
  if (!Number.isFinite(value)) {
    return DEFAULT_HISTORY_MINIMUM_DURATION_SECONDS;
  }
  return Math.min(
    MAX_HISTORY_MINIMUM_DURATION_SECONDS,
    Math.max(MIN_HISTORY_MINIMUM_DURATION_SECONDS, Math.round(value)),
  );
}
