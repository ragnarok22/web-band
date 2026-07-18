import { MAX_BPM, MIN_BPM } from "@/lib/musical-time";

const MAX_TAPS = 5;
const MIN_INTERVAL_MS = 60_000 / MAX_BPM;
export const TAP_RESET_MS = 60_000 / MIN_BPM;

export interface TapTempoResult {
  bpm: number | null;
  taps: number[];
}

export function recordTempoTap(
  previousTaps: readonly number[],
  timestamp: number,
): TapTempoResult {
  const previousTap = previousTaps.at(-1);
  if (previousTap === undefined || timestamp - previousTap > TAP_RESET_MS) {
    return { bpm: null, taps: [timestamp] };
  }

  if (timestamp - previousTap < MIN_INTERVAL_MS) {
    return { bpm: null, taps: [...previousTaps] };
  }

  const taps = [...previousTaps, timestamp].slice(-MAX_TAPS);
  let intervalTotal = 0;
  for (let index = 1; index < taps.length; index += 1) {
    intervalTotal += (taps[index] ?? 0) - (taps[index - 1] ?? 0);
  }
  const averageInterval = intervalTotal / (taps.length - 1);
  const bpm = Math.round(60_000 / averageInterval);

  return { bpm: Math.min(MAX_BPM, Math.max(MIN_BPM, bpm)), taps };
}
