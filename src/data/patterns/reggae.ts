import { createPattern, hit, pulse } from "@/data/patterns/pattern-builder";

export const reggaePatterns = [
  createPattern({
    bars: 1,
    category: "reggae",
    defaultBpm: 76,
    description:
      "Classic one-drop practice shape with kick and rim on beat three.",
    difficulty: "beginner",
    id: "one-drop",
    name: "One Drop",
    recommendedBpmRange: { min: 58, max: 96 },
    subdivision: 8,
    timeSignature: { denominator: 4, numerator: 4 },
    tracks: {
      closedHat: pulse(8, 1, 0, 2),
      kick: [hit(4, 0.9)],
      rim: [hit(4, 0.84)],
    },
  }),
  createPattern({
    bars: 1,
    category: "reggae",
    defaultBpm: 84,
    description: "Quarter-note kick pulse with light offbeat hat emphasis.",
    difficulty: "beginner",
    id: "steppers",
    name: "Steppers",
    recommendedBpmRange: { min: 64, max: 108 },
    subdivision: 8,
    timeSignature: { denominator: 4, numerator: 4 },
    tracks: {
      closedHat: [1, 3, 5, 7].map((step) => hit(step, 0.64)),
      kick: [0, 2, 4, 6].map((step) => hit(step, step === 0 ? 0.96 : 0.78)),
      rim: [hit(4, 0.72)],
    },
  }),
  createPattern({
    bars: 1,
    category: "reggae",
    defaultBpm: 80,
    description: "Rockers-style kick movement with a clear beat-three snare.",
    difficulty: "intermediate",
    id: "rockers",
    name: "Rockers",
    recommendedBpmRange: { min: 60, max: 104 },
    subdivision: 8,
    timeSignature: { denominator: 4, numerator: 4 },
    tracks: {
      closedHat: [1, 3, 5, 7].map((step) => hit(step, 0.62)),
      kick: [hit(0, 0.92), hit(3, 0.6), hit(6, 0.76)],
      snare: [hit(4, 0.82)],
    },
  }),
  createPattern({
    bars: 1,
    category: "reggae",
    defaultBpm: 78,
    description:
      "Simple offbeat hi-hat groove for skank and chord timing practice.",
    difficulty: "beginner",
    id: "basic-reggae-practice",
    name: "Basic Reggae Practice Groove",
    recommendedBpmRange: { min: 56, max: 102 },
    subdivision: 8,
    timeSignature: { denominator: 4, numerator: 4 },
    tracks: {
      closedHat: [1, 3, 5, 7].map((step) => hit(step, 0.66)),
      kick: [hit(0, 0.84), hit(4, 0.78)],
      rim: [hit(2, 0.62), hit(6, 0.68)],
    },
  }),
] as const;
