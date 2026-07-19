import { describe, expect, it } from "vitest";

import { builtInFills } from "@/data/fills";
import {
  validateFillArrangement,
  validateFillLibrary,
} from "@/lib/fill-validation";

describe("fill validation", () => {
  it("accepts the complete built-in fill library", () => {
    expect(validateFillLibrary(builtInFills)).toEqual({
      errors: [],
      success: true,
    });
  });

  it("rejects unsafe cells and silent endings", () => {
    const fill = structuredClone(builtInFills[0]!);
    fill.tail[8] = [
      [
        { instrument: "snare", velocity: 1.2 },
        { instrument: "snare", velocity: 0.7 },
      ],
      [],
    ];

    const result = validateFillArrangement(fill);
    expect(result.success).toBe(false);
    expect(result.errors).toEqual(
      expect.arrayContaining([
        expect.stringMatching(/velocity/i),
        expect.stringMatching(/duplicate instrument/i),
        expect.stringMatching(/final cell/i),
      ]),
    );
  });

  it("rejects duplicate IDs and incomplete category coverage", () => {
    const duplicated = [builtInFills[0]!, builtInFills[0]!];
    const result = validateFillLibrary(duplicated);

    expect(result.success).toBe(false);
    expect(result.errors).toEqual(
      expect.arrayContaining([
        expect.stringMatching(/IDs must be unique/i),
        expect.stringMatching(/missing a compatible fill/i),
      ]),
    );
  });
});
