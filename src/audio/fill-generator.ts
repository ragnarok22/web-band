import { getCompatibleFills, toFillMeter } from "@/data/fills";
import { getStepsPerBar } from "@/lib/musical-time";
import type { FillFrequency } from "@/types/audio";
import type { FillArrangement, FillHit } from "@/types/fill";
import type { DrumPattern } from "@/types/pattern";

export const RANDOM_FILL_PROBABILITY = 0.2;

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

export function selectFillArrangement(
  pattern: DrumPattern,
  ordinal: number,
): FillArrangement | null {
  const meter = toFillMeter(
    pattern.timeSignature.numerator,
    pattern.timeSignature.denominator,
  );
  if (!meter) return null;
  const compatible = getCompatibleFills(
    pattern.category,
    meter,
    pattern.subdivision,
  );
  return compatible.length === 0
    ? null
    : (compatible[ordinal % compatible.length] ?? null);
}

export function getFillStep(
  arrangement: FillArrangement,
  pattern: DrumPattern,
  stepInBar: number,
): { hits: readonly FillHit[]; isFillStep: boolean } {
  const stepsPerBar = getStepsPerBar(
    pattern.timeSignature,
    pattern.subdivision,
  );
  const tail = arrangement.tail[pattern.subdivision];
  const fillStart = stepsPerBar - tail.length;
  if (stepInBar < fillStart || stepInBar >= stepsPerBar) {
    return { hits: [], isFillStep: false };
  }
  return {
    hits: tail[stepInBar - fillStart] ?? [],
    isFillStep: true,
  };
}
