import { describe, expect, it, vi } from "vitest";

import {
  getFillStep,
  selectFillArrangement,
  shouldFillMeasure,
} from "@/audio/fill-generator";
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

  it("selects compatible arrangements deterministically", () => {
    expect(selectFillArrangement(basicRockPattern, 0)?.id).toBe(
      "compact-tom-drop",
    );
    expect(selectFillArrangement(basicRockPattern, 1)?.id).toBe(
      "backbeat-lift",
    );
  });

  it("anchors fills to the bar ending and preserves intentional rests", () => {
    const arrangement = selectFillArrangement(basicRockPattern, 0)!;
    expect(getFillStep(arrangement, basicRockPattern, 5)).toEqual({
      hits: [],
      isFillStep: false,
    });
    expect(getFillStep(arrangement, basicRockPattern, 6).isFillStep).toBe(true);
    expect(getFillStep(arrangement, basicRockPattern, 7)).toEqual(
      expect.objectContaining({
        hits: expect.arrayContaining([
          expect.objectContaining({ instrument: "kick" }),
        ]),
        isFillStep: true,
      }),
    );
  });
});
