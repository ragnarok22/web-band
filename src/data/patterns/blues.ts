import { createPattern, hit, pulse } from "@/data/patterns/pattern-builder";

export const bluesPatterns = [
  createPattern({
    bars: 1,
    category: "blues",
    defaultBpm: 92,
    description:
      "Straight eighth-note blues-rock foundation with a firm backbeat.",
    difficulty: "beginner",
    id: "straight-blues",
    name: "Straight Blues",
    recommendedBpmRange: { min: 65, max: 125 },
    subdivision: 8,
    timeSignature: { denominator: 4, numerator: 4 },
    tracks: {
      closedHat: pulse(8),
      kick: [hit(0, 0.96), hit(4, 0.84), hit(7, 0.55)],
      snare: [hit(2, 0.86), hit(6, 0.92)],
    },
  }),
  createPattern({
    bars: 1,
    category: "blues",
    defaultBpm: 98,
    description: "Triplet-based shuffle for practicing swung blues phrases.",
    difficulty: "intermediate",
    id: "shuffle-blues",
    name: "Shuffle Blues",
    recommendedBpmRange: { min: 68, max: 132 },
    subdivision: 8,
    swing: 0.34,
    timeSignature: { denominator: 8, numerator: 12 },
    tracks: {
      closedHat: [0, 2, 3, 5, 6, 8, 9, 11].map((step) =>
        hit(step, step % 3 === 0 ? 0.74 : 0.48),
      ),
      kick: [hit(0, 0.96), hit(6, 0.82), hit(8, 0.58)],
      snare: [hit(3, 0.84), hit(9, 0.92)],
    },
  }),
  createPattern({
    bars: 1,
    category: "blues",
    defaultBpm: 58,
    description:
      "Wide twelve-eight pulse for slow bends and spacious chord work.",
    difficulty: "beginner",
    id: "slow-twelve-eight-blues",
    name: "Slow 12/8 Blues",
    recommendedBpmRange: { min: 40, max: 78 },
    subdivision: 8,
    timeSignature: { denominator: 8, numerator: 12 },
    tracks: {
      ride: pulse(12, 1, 0, 3),
      kick: [hit(0, 0.94), hit(7, 0.58)],
      snare: [hit(6, 0.88)],
    },
  }),
  createPattern({
    bars: 1,
    category: "blues",
    defaultBpm: 116,
    description:
      "A stronger rock backbeat with blues-friendly kick syncopation.",
    difficulty: "intermediate",
    id: "blues-rock",
    name: "Blues Rock",
    recommendedBpmRange: { min: 82, max: 150 },
    subdivision: 8,
    timeSignature: { denominator: 4, numerator: 4 },
    tracks: {
      closedHat: pulse(8),
      crash: [hit(0, 0.65)],
      kick: [hit(0, 1), hit(3, 0.64), hit(4, 0.88), hit(7, 0.7)],
      snare: [hit(2, 0.9), hit(6, 0.96)],
    },
  }),
  createPattern({
    bars: 1,
    category: "blues",
    defaultBpm: 122,
    description: "Energetic twelve-eight shuffle with a walking kick feel.",
    difficulty: "advanced",
    id: "texas-style-shuffle",
    name: "Texas-Style Shuffle Practice",
    recommendedBpmRange: { min: 88, max: 162 },
    subdivision: 8,
    swing: 0.4,
    timeSignature: { denominator: 8, numerator: 12 },
    tracks: {
      kick: [0, 2, 3, 5, 6, 8, 9, 11].map((step) =>
        hit(step, step % 3 === 0 ? 0.86 : 0.55),
      ),
      ride: [0, 2, 3, 5, 6, 8, 9, 11].map((step) =>
        hit(step, step % 3 === 0 ? 0.76 : 0.48),
      ),
      snare: [hit(3, 0.82), hit(9, 0.9)],
    },
  }),
] as const;
