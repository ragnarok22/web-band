import type { DrumPattern, TimeSignature } from "@/types/pattern";

export const MIN_BPM = 40;
export const MAX_BPM = 220;

export function clampBpm(value: number, fallback = 90): number {
  if (!Number.isFinite(value)) {
    return fallback;
  }

  return Math.min(MAX_BPM, Math.max(MIN_BPM, Math.round(value)));
}

export function getStepsPerBar(
  timeSignature: TimeSignature,
  subdivision: 8 | 16,
): number {
  return timeSignature.numerator * (subdivision / timeSignature.denominator);
}

export function getPatternStepCount(pattern: DrumPattern): number {
  return (
    getStepsPerBar(pattern.timeSignature, pattern.subdivision) * pattern.bars
  );
}

export function getSubdivisionNotation(subdivision: 8 | 16): "8n" | "16n" {
  return subdivision === 8 ? "8n" : "16n";
}

export function getBeatLabels(
  pattern: Pick<DrumPattern, "subdivision" | "timeSignature">,
): string[] {
  const stepsPerBeat = pattern.subdivision / pattern.timeSignature.denominator;
  const sixteenthLabels = ["", "e", "&", "a"];
  const eighthLabels = ["", "&"];
  const labels: string[] = [];

  for (
    let step = 0;
    step < getStepsPerBar(pattern.timeSignature, pattern.subdivision);
    step += 1
  ) {
    const beat = Math.floor(step / stepsPerBeat) + 1;
    const withinBeat = step % stepsPerBeat;
    const subdivisionLabel =
      pattern.subdivision === 16
        ? sixteenthLabels[withinBeat]
        : eighthLabels[withinBeat];

    labels.push(withinBeat === 0 ? String(beat) : (subdivisionLabel ?? ""));
  }

  return labels;
}
