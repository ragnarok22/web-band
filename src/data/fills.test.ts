import { describe, expect, it } from "vitest";

import {
  builtInFills,
  getCompatibleFills,
  supportedFillMeters,
} from "@/data/fills";
import type { PatternCategory } from "@/types/pattern";

const categories: PatternCategory[] = [
  "rock",
  "pop",
  "blues",
  "funk",
  "reggae",
  "country",
  "ballad",
  "latin",
  "metal",
  "jazz",
  "custom",
];

describe("fill catalog", () => {
  it("locks the original arrangement IDs", () => {
    expect(builtInFills.map(({ id }) => id)).toEqual([
      "compact-tom-drop",
      "backbeat-lift",
      "pocket-turn",
      "compound-tom-wave",
      "odd-meter-pivot",
    ]);
  });

  it("covers every supported category, meter, and grid", () => {
    for (const category of categories) {
      for (const meter of supportedFillMeters) {
        for (const subdivision of [8, 16] as const) {
          expect(
            getCompatibleFills(category, meter, subdivision),
            `${category} ${meter} ${subdivision}`,
          ).not.toHaveLength(0);
        }
      }
    }
  });

  it("keeps compound and odd-meter arrangements specific", () => {
    expect(getCompatibleFills("jazz", "6/8", 8).map(({ id }) => id)).toContain(
      "compound-tom-wave",
    );
    expect(getCompatibleFills("funk", "7/8", 16).map(({ id }) => id)).toContain(
      "odd-meter-pivot",
    );
    expect(
      getCompatibleFills("jazz", "4/4", 8).map(({ id }) => id),
    ).not.toContain("compound-tom-wave");
  });
});
