import { describe, expect, it } from "vitest";

import {
  basicPopPattern,
  builtInStrummingPatterns,
  getBuiltInStrummingPattern,
} from "@/data/strumming-patterns";
import { validateStrummingPattern } from "@/lib/practice-validation";
import type { StrumAction } from "@/types/practice";

describe("built-in strumming patterns", () => {
  it("provides all seven planned beginner patterns", () => {
    expect(builtInStrummingPatterns.map((pattern) => pattern.id)).toEqual([
      "quarter-downstrokes",
      "eighth-downstrokes",
      "down-down-up-up-down-up",
      "beginner-ballad",
      "basic-pop-strumming",
      "basic-three-four",
      "basic-six-eight",
    ]);
    expect(
      builtInStrummingPatterns.every(
        (pattern) =>
          pattern.isBuiltIn && validateStrummingPattern(pattern).success,
      ),
    ).toBe(true);
  });

  it("defines an explicit action for every subdivision", () => {
    for (const pattern of builtInStrummingPatterns) {
      const expectedSteps =
        pattern.timeSignature.numerator *
        (pattern.subdivision / pattern.timeSignature.denominator);
      expect(pattern.steps).toHaveLength(expectedSteps);
      expect(pattern.steps.map((step) => step.subdivisionIndex)).toEqual(
        Array.from({ length: expectedSteps }, (_, index) => index),
      );
      expect(new Set(pattern.steps.map((step) => step.id)).size).toBe(
        expectedSteps,
      );
    }
  });

  it("covers every supported action and both subdivisions", () => {
    const actions = new Set(
      builtInStrummingPatterns.flatMap((pattern) =>
        pattern.steps.map((step) => step.action),
      ),
    );

    expect(actions).toEqual(
      new Set<StrumAction>(["down", "up", "mute", "rest", "hold"]),
    );
    expect(
      new Set(builtInStrummingPatterns.map((pattern) => pattern.subdivision)),
    ).toEqual(new Set([8, 16]));
    expect(basicPopPattern.steps.some((step) => step.accent)).toBe(true);
  });

  it("looks up known patterns without substituting an unknown ID", () => {
    expect(getBuiltInStrummingPattern("basic-six-eight")?.name).toBe(
      "Basic 6/8",
    );
    expect(getBuiltInStrummingPattern("unknown")).toBeUndefined();
  });
});
