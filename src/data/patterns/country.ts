import { createPattern, hit, pulse } from "@/data/patterns/pattern-builder";

export const countryPatterns = [
  createPattern({
    bars: 1,
    category: "country",
    defaultBpm: 108,
    description:
      "Straight country backbeat for open chords and alternating bass.",
    difficulty: "beginner",
    id: "basic-country",
    name: "Basic Country",
    recommendedBpmRange: { min: 78, max: 145 },
    subdivision: 8,
    timeSignature: { denominator: 4, numerator: 4 },
    tracks: {
      closedHat: pulse(8),
      kick: [hit(0, 0.94), hit(4, 0.86)],
      snare: [hit(2, 0.82), hit(6, 0.88)],
    },
  }),
  createPattern({
    bars: 1,
    category: "country",
    defaultBpm: 132,
    description:
      "Rolling sixteenth snare texture with an alternating country kick.",
    difficulty: "advanced",
    id: "train-beat",
    name: "Train Beat",
    recommendedBpmRange: { min: 92, max: 180 },
    subdivision: 16,
    timeSignature: { denominator: 4, numerator: 4 },
    tracks: {
      kick: [hit(0, 0.9), hit(8, 0.84)],
      snare: pulse(16, 1, 0, 4).map((step, index) => ({
        ...step,
        velocity: index % 2 === 0 ? 0.56 : 0.34,
      })),
    },
  }),
  createPattern({
    bars: 1,
    category: "ballad",
    defaultBpm: 70,
    description:
      "Gentle cross-stick country ballad groove with sparse kick support.",
    difficulty: "beginner",
    id: "country-ballad",
    name: "Country Ballad",
    recommendedBpmRange: { min: 50, max: 94 },
    subdivision: 8,
    timeSignature: { denominator: 4, numerator: 4 },
    tracks: {
      closedHat: pulse(8).map((step) => ({
        ...step,
        velocity: (step.velocity ?? 0.5) * 0.7,
      })),
      kick: [hit(0, 0.82), hit(5, 0.54)],
      rim: [hit(2, 0.66), hit(6, 0.72)],
    },
  }),
  createPattern({
    bars: 1,
    category: "country",
    defaultBpm: 122,
    description:
      "Driving country-rock groove with an extra kick into beat four.",
    difficulty: "intermediate",
    id: "country-rock",
    name: "Country Rock",
    recommendedBpmRange: { min: 88, max: 158 },
    subdivision: 8,
    timeSignature: { denominator: 4, numerator: 4 },
    tracks: {
      closedHat: pulse(8),
      crash: [hit(0, 0.62)],
      kick: [hit(0, 1), hit(4, 0.86), hit(5, 0.58), hit(7, 0.65)],
      snare: [hit(2, 0.88), hit(6, 0.94)],
    },
  }),
] as const;
