import type { DrumHit, DrumPattern } from "@/types/pattern";

function createHit(
  instrument: DrumHit["instrument"],
  step: number,
  velocity: number,
): DrumHit {
  return {
    id: `basic-rock-${instrument}-${step}`,
    instrument,
    step,
    velocity,
  };
}

export const basicRockPattern: DrumPattern = {
  bars: 1,
  category: "rock",
  defaultBpm: 90,
  description:
    "Steady eighth-note hats with a clear backbeat for everyday practice.",
  difficulty: "beginner",
  hits: [
    ...[0, 1, 2, 3, 4, 5, 6, 7].map((step) =>
      createHit("closedHat", step, step % 2 === 0 ? 0.72 : 0.48),
    ),
    createHit("kick", 0, 1),
    createHit("kick", 4, 0.9),
    createHit("snare", 2, 0.88),
    createHit("snare", 6, 0.96),
  ],
  id: "basic-rock",
  isBuiltIn: true,
  name: "Basic Rock",
  recommendedBpmRange: {
    min: 70,
    max: 130,
  },
  subdivision: 8,
  timeSignature: {
    denominator: 4,
    numerator: 4,
  },
};

export const builtInPatterns = [basicRockPattern] as const;

export function getBuiltInPattern(patternId: string): DrumPattern {
  return (
    builtInPatterns.find((pattern) => pattern.id === patternId) ??
    basicRockPattern
  );
}
