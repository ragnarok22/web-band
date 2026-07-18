import { getStepsPerBar } from "@/lib/musical-time";
import type { FillFrequency } from "@/types/audio";
import type { DrumInstrument, DrumPattern } from "@/types/pattern";

export const RANDOM_FILL_PROBABILITY = 0.2;

export interface GeneratedFillHit {
  instrument: DrumInstrument;
  velocity: number;
}

export function shouldFillMeasure(
  frequency: FillFrequency,
  measure: number,
  previousMeasureWasFill: boolean,
  random: () => number,
): boolean {
  if (frequency === null) return false;
  if (typeof frequency === "number") return measure % frequency === 0;
  if (measure === 1 || previousMeasureWasFill) return false;
  return random() < RANDOM_FILL_PROBABILITY;
}

export function getGenericFillHits(
  pattern: DrumPattern,
  stepInBar: number,
): readonly GeneratedFillHit[] {
  const stepsPerBar = getStepsPerBar(
    pattern.timeSignature,
    pattern.subdivision,
  );
  const fillLength = Math.max(1, Math.floor(stepsPerBar / 2));
  const fillStart = stepsPerBar - fillLength;
  if (stepInBar < fillStart || stepInBar >= stepsPerBar) return [];

  const fillStep = stepInBar - fillStart;
  const instruments: readonly DrumInstrument[] = [
    "snare",
    "highTom",
    "midTom",
    "lowTom",
  ];
  const instrumentIndex = Math.min(
    instruments.length - 1,
    Math.floor((fillStep / fillLength) * instruments.length),
  );
  const hits: GeneratedFillHit[] = [
    {
      instrument: instruments[instrumentIndex] ?? "snare",
      velocity: 0.72 + (fillStep / Math.max(1, fillLength - 1)) * 0.2,
    },
  ];

  if (stepInBar === stepsPerBar - 1) {
    hits.push({ instrument: "kick", velocity: 0.88 });
  }

  return hits;
}
