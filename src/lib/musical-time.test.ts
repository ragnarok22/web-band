import { describe, expect, it } from "vitest";

import { basicRockPattern } from "@/data/patterns/rock";
import { utilityPatterns } from "@/data/patterns/utility";
import { balladPattern } from "@/data/strumming-patterns";
import {
  clampBpm,
  getBeatLabels,
  getPatternStepCount,
  getStepsPerBar,
} from "@/lib/musical-time";

describe("musical time", () => {
  it("clamps and rounds BPM values", () => {
    expect(clampBpm(20)).toBe(40);
    expect(clampBpm(220.7)).toBe(220);
    expect(clampBpm(92.6)).toBe(93);
    expect(clampBpm(Number.NaN, 100)).toBe(100);
  });

  it("calculates bar and pattern lengths for supported subdivisions", () => {
    expect(getStepsPerBar({ numerator: 4, denominator: 4 }, 8)).toBe(8);
    expect(getStepsPerBar({ numerator: 3, denominator: 4 }, 16)).toBe(12);
    expect(getStepsPerBar({ numerator: 6, denominator: 8 }, 8)).toBe(6);
    expect(getPatternStepCount(basicRockPattern)).toBe(8);
  });

  it.each([
    {
      id: "simple-two-four",
      labels: ["1", "&", "2", "&"],
      sixteenthSteps: 8,
      steps: 4,
    },
    {
      id: "simple-five-four",
      labels: ["1", "&", "2", "&", "3", "&", "4", "&", "5", "&"],
      sixteenthSteps: 20,
      steps: 10,
    },
    {
      id: "simple-seven-eight",
      labels: ["1", "2", "3", "4", "5", "6", "7"],
      sixteenthSteps: 14,
      steps: 7,
    },
    {
      id: "basic-jazz-ride",
      labels: ["1", "2", "3", "4", "5", "6", "7", "8", "9", "10", "11", "12"],
      sixteenthSteps: 24,
      steps: 12,
    },
  ])(
    "calculates and labels the $id meter directly",
    ({ id, labels, sixteenthSteps, steps }) => {
      const pattern = utilityPatterns.find((candidate) => candidate.id === id);
      if (!pattern) throw new Error(`Missing utility pattern: ${id}`);

      expect(getStepsPerBar(pattern.timeSignature, 8)).toBe(steps);
      expect(getStepsPerBar(pattern.timeSignature, 16)).toBe(sixteenthSteps);
      expect(getPatternStepCount(pattern)).toBe(steps);
      expect(getBeatLabels(pattern)).toEqual(labels);
    },
  );

  it("creates readable eighth-note labels", () => {
    expect(getBeatLabels(basicRockPattern)).toEqual([
      "1",
      "&",
      "2",
      "&",
      "3",
      "&",
      "4",
      "&",
    ]);
  });

  it("creates readable sixteenth-note labels for strumming patterns", () => {
    expect(getBeatLabels(balladPattern)).toEqual([
      "1",
      "e",
      "&",
      "a",
      "2",
      "e",
      "&",
      "a",
      "3",
      "e",
      "&",
      "a",
      "4",
      "e",
      "&",
      "a",
    ]);
  });
});
