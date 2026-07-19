import { describe, expect, it } from "vitest";

import { basicRockPattern } from "@/data/patterns/rock";
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
