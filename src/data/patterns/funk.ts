import { createPattern, hit, pulse } from "@/data/patterns/pattern-builder";

export const funkPatterns = [
  createPattern({
    bars: 1,
    category: "funk",
    defaultBpm: 96,
    description:
      "Accessible sixteenth-note funk with clear backbeats and rests.",
    difficulty: "intermediate",
    id: "basic-sixteenth-funk",
    name: "Basic Sixteenth Funk",
    recommendedBpmRange: { min: 72, max: 116 },
    subdivision: 16,
    timeSignature: { denominator: 4, numerator: 4 },
    tracks: {
      closedHat: pulse(16, 1, 0, 4),
      kick: [hit(0, 1), hit(3, 0.58), hit(7, 0.72), hit(10, 0.82)],
      snare: [hit(4, 0.88), hit(12, 0.94)],
    },
  }),
  createPattern({
    bars: 1,
    category: "funk",
    defaultBpm: 102,
    description:
      "Broken hats and displaced kicks for tighter rhythmic accuracy.",
    difficulty: "advanced",
    id: "syncopated-funk",
    name: "Syncopated Funk",
    recommendedBpmRange: { min: 76, max: 124 },
    subdivision: 16,
    timeSignature: { denominator: 4, numerator: 4 },
    tracks: {
      closedHat: [0, 2, 3, 4, 6, 8, 10, 11, 12, 14, 15].map((step) =>
        hit(step, step % 4 === 0 ? 0.74 : 0.5),
      ),
      kick: [
        hit(0, 1),
        hit(3, 0.68),
        hit(6, 0.58),
        hit(10, 0.82),
        hit(15, 0.65),
      ],
      openHat: [hit(7, 0.54)],
      snare: [hit(4, 0.9), hit(12, 0.96)],
    },
  }),
  createPattern({
    bars: 1,
    category: "funk",
    defaultBpm: 92,
    description:
      "Soft probability-based snare notes surround a strong funk backbeat.",
    difficulty: "advanced",
    id: "ghost-note-funk",
    name: "Ghost-Note-Inspired Groove",
    recommendedBpmRange: { min: 68, max: 112 },
    subdivision: 16,
    timeSignature: { denominator: 4, numerator: 4 },
    tracks: {
      closedHat: pulse(16, 1, 0, 4),
      kick: [hit(0, 1), hit(6, 0.68), hit(10, 0.82), hit(15, 0.58)],
      snare: [
        hit(3, 0.24, { probability: 0.65 }),
        hit(4, 0.92),
        hit(7, 0.22, { probability: 0.7 }),
        hit(11, 0.25, { probability: 0.7 }),
        hit(12, 0.96),
        hit(14, 0.2, { probability: 0.6 }),
      ],
    },
  }),
  createPattern({
    bars: 1,
    category: "funk",
    defaultBpm: 86,
    description: "Half-time funk pocket with a deep beat-three backbeat.",
    difficulty: "intermediate",
    id: "half-time-funk",
    name: "Half-Time Funk",
    recommendedBpmRange: { min: 62, max: 108 },
    subdivision: 16,
    timeSignature: { denominator: 4, numerator: 4 },
    tracks: {
      closedHat: pulse(8, 2),
      kick: [hit(0, 1), hit(3, 0.58), hit(7, 0.7), hit(13, 0.62)],
      openHat: [hit(14, 0.52)],
      snare: [hit(8, 1)],
    },
  }),
] as const;
