import { describe, expect, it } from "vitest";

import {
  builtInChordProgressions,
  getBuiltInChordProgression,
  twelveBarBluesInA,
} from "@/data/chord-progressions";
import { validateChordProgression } from "@/lib/practice-validation";

describe("built-in chord progressions", () => {
  it("provides the five planned generic progressions with stable IDs", () => {
    expect(
      builtInChordProgressions.map((progression) => progression.id),
    ).toEqual([
      "g-d-em-c",
      "c-g-am-f",
      "am-f-c-g",
      "twelve-bar-blues-in-a",
      "simple-one-four-five-in-c",
    ]);
    expect(
      builtInChordProgressions.every(
        (progression) =>
          progression.isBuiltIn &&
          validateChordProgression(progression).success,
      ),
    ).toBe(true);
    expect(
      builtInChordProgressions.flatMap((progression) => [
        progression.id,
        ...progression.steps.map((step) => step.id),
      ]),
    ).toSatisfy((ids: string[]) =>
      ids.every((id) => /^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(id)),
    );
  });

  it("defines an exact 12-measure blues in A", () => {
    expect(twelveBarBluesInA.steps).toHaveLength(12);
    expect(
      twelveBarBluesInA.steps.reduce(
        (measures, step) =>
          measures + (step.durationUnit === "measures" ? step.duration : 0),
        0,
      ),
    ).toBe(12);
    expect(twelveBarBluesInA.steps.map((step) => step.chord)).toEqual([
      "A7",
      "A7",
      "A7",
      "A7",
      "D7",
      "D7",
      "A7",
      "A7",
      "E7",
      "D7",
      "A7",
      "E7",
    ]);
  });

  it("looks up known progressions without substituting an unknown ID", () => {
    expect(getBuiltInChordProgression("g-d-em-c")?.name).toBe("G - D - Em - C");
    expect(getBuiltInChordProgression("unknown")).toBeUndefined();
  });
});
