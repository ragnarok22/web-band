import { createPattern, hit, pulse } from "@/data/patterns/pattern-builder";

export const latinPatterns = [
  createPattern({
    bars: 1,
    category: "latin",
    defaultBpm: 124,
    description:
      "Soft bossa-inspired cross-stick pulse for chord comping practice.",
    difficulty: "intermediate",
    id: "basic-bossa-inspired",
    name: "Basic Bossa-Inspired Rhythm",
    recommendedBpmRange: { min: 92, max: 154 },
    subdivision: 16,
    timeSignature: { denominator: 4, numerator: 4 },
    tracks: {
      closedHat: pulse(8, 2),
      kick: [hit(0, 0.78), hit(3, 0.48), hit(8, 0.72), hit(11, 0.46)],
      rim: [hit(4, 0.64), hit(10, 0.58), hit(14, 0.68)],
    },
  }),
  createPattern({
    bars: 1,
    category: "latin",
    defaultBpm: 104,
    description:
      "Generic son-inspired clave framework for rhythmic chord placement.",
    difficulty: "intermediate",
    id: "basic-son-inspired",
    name: "Basic Son-Inspired Practice Groove",
    recommendedBpmRange: { min: 78, max: 136 },
    subdivision: 16,
    timeSignature: { denominator: 4, numerator: 4 },
    tracks: {
      closedHat: pulse(8, 2),
      kick: [hit(0, 0.8), hit(6, 0.58), hit(10, 0.72)],
      rim: [hit(0, 0.68), hit(6, 0.62), hit(12, 0.72), hit(14, 0.64)],
    },
  }),
  createPattern({
    bars: 1,
    category: "latin",
    defaultBpm: 112,
    description:
      "Cha-cha-inspired bell and cross-stick pattern for steady comping.",
    difficulty: "intermediate",
    id: "basic-cha-cha-inspired",
    name: "Basic Cha-Cha-Inspired Practice Groove",
    recommendedBpmRange: { min: 88, max: 134 },
    subdivision: 16,
    timeSignature: { denominator: 4, numerator: 4 },
    tracks: {
      kick: [hit(0, 0.74), hit(8, 0.7)],
      ride: [0, 3, 6, 8, 11, 14].map((step) =>
        hit(step, step % 8 === 0 ? 0.68 : 0.48),
      ),
      rim: [hit(4, 0.7), hit(12, 0.74)],
    },
  }),
  createPattern({
    bars: 1,
    category: "latin",
    defaultBpm: 116,
    description:
      "Straight latin-rock backbeat with syncopated tom and kick answers.",
    difficulty: "advanced",
    id: "basic-latin-rock",
    name: "Basic Latin Rock",
    recommendedBpmRange: { min: 86, max: 148 },
    subdivision: 16,
    timeSignature: { denominator: 4, numerator: 4 },
    tracks: {
      closedHat: pulse(8, 2),
      highTom: [hit(3, 0.54), hit(11, 0.58)],
      kick: [hit(0, 0.96), hit(6, 0.68), hit(8, 0.84), hit(14, 0.62)],
      lowTom: [hit(7, 0.65), hit(15, 0.7)],
      snare: [hit(4, 0.86), hit(12, 0.92)],
    },
  }),
] as const;
