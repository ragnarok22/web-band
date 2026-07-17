import type { DrumHit, DrumInstrument, DrumPattern } from "@/types/pattern";

export interface PatternHitSpec {
  flam?: boolean;
  probability?: number;
  step: number;
  timingOffset?: number;
  velocity?: number;
}

type PatternSeed = Omit<DrumPattern, "hits" | "isBuiltIn"> & {
  tracks: Partial<Record<DrumInstrument, readonly PatternHitSpec[]>>;
};

const instruments: readonly DrumInstrument[] = [
  "kick",
  "snare",
  "closedHat",
  "openHat",
  "lowTom",
  "midTom",
  "highTom",
  "crash",
  "ride",
  "rim",
  "clap",
];

export function hit(
  step: number,
  velocity = 0.72,
  options: Omit<PatternHitSpec, "step" | "velocity"> = {},
): PatternHitSpec {
  return { ...options, step, velocity };
}

export function pulse(
  count: number,
  interval = 1,
  start = 0,
  strongEvery = 2,
): PatternHitSpec[] {
  return Array.from({ length: count }, (_, index) =>
    hit(start + index * interval, index % strongEvery === 0 ? 0.72 : 0.48),
  );
}

export function createPattern(seed: PatternSeed): DrumPattern {
  const hits: DrumHit[] = [];

  for (const instrument of instruments) {
    const track = seed.tracks[instrument] ?? [];
    track.forEach((spec, index) => {
      hits.push({
        flam: spec.flam,
        id: `${seed.id}-${instrument}-${spec.step}-${index}`,
        instrument,
        probability: spec.probability,
        step: spec.step,
        timingOffset: spec.timingOffset,
        velocity: spec.velocity ?? 0.72,
      });
    });
  }

  return {
    bars: seed.bars,
    category: seed.category,
    defaultBpm: seed.defaultBpm,
    description: seed.description,
    difficulty: seed.difficulty,
    hits,
    id: seed.id,
    isBuiltIn: true,
    name: seed.name,
    recommendedBpmRange: seed.recommendedBpmRange,
    subdivision: seed.subdivision,
    swing: seed.swing,
    timeSignature: seed.timeSignature,
  };
}
