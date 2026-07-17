import { describe, expect, it } from "vitest";

import { basicRockPattern } from "@/data/patterns/rock";
import { isDrumPattern, validatePattern } from "@/lib/pattern-validation";

describe("pattern validation", () => {
  it("accepts the built-in Basic Rock pattern", () => {
    expect(isDrumPattern(basicRockPattern)).toBe(true);
  });

  it("rejects hits outside the pattern and invalid velocities", () => {
    const malformedPattern = {
      ...basicRockPattern,
      hits: [
        {
          id: "bad-hit",
          instrument: "kick",
          step: 99,
          velocity: 4,
        },
      ],
    };

    const result = validatePattern(malformedPattern);
    expect(result.success).toBe(false);
    expect(result.errors).toContain("One or more drum hits are invalid.");
  });

  it("rejects non-object imported data without throwing", () => {
    expect(validatePattern("not a pattern")).toEqual({
      success: false,
      errors: ["Pattern must be an object."],
    });
  });
});
