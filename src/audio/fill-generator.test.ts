import { describe, expect, it, vi } from "vitest";

import { getGenericFillHits, shouldFillMeasure } from "@/audio/fill-generator";
import { basicRockPattern } from "@/data/patterns/rock";

describe("fill generator", () => {
  it("selects fixed phrase boundaries", () => {
    expect(shouldFillMeasure(4, 3, false, vi.fn())).toBe(false);
    expect(shouldFillMeasure(4, 4, false, vi.fn())).toBe(true);
    expect(shouldFillMeasure(8, 8, false, vi.fn())).toBe(true);
    expect(shouldFillMeasure(16, 16, false, vi.fn())).toBe(true);
  });

  it("avoids first-measure and consecutive random fills", () => {
    const random = vi.fn(() => 0.1);
    expect(shouldFillMeasure("random", 1, false, random)).toBe(false);
    expect(shouldFillMeasure("random", 2, true, random)).toBe(false);
    expect(shouldFillMeasure("random", 2, false, random)).toBe(true);
    expect(random).toHaveBeenCalledOnce();
  });

  it("keeps fills in the final half of a bar and ends with kick", () => {
    expect(getGenericFillHits(basicRockPattern, 3)).toEqual([]);
    expect(getGenericFillHits(basicRockPattern, 4)).not.toEqual([]);
    expect(getGenericFillHits(basicRockPattern, 7)).toEqual(
      expect.arrayContaining([{ instrument: "kick", velocity: 0.88 }]),
    );
  });
});
