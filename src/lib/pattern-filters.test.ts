import { describe, expect, it } from "vitest";

import { builtInPatterns } from "@/data/patterns";
import {
  defaultPatternFilters,
  filterAndSortPatterns,
} from "@/lib/pattern-filters";

describe("pattern filters", () => {
  it("filters by search, category, difficulty, meter, and grid", () => {
    const result = filterAndSortPatterns(
      builtInPatterns,
      {
        category: "funk",
        difficulty: "advanced",
        search: "syncopated",
        subdivision: 16,
        timeSignature: "4/4",
      },
      "name",
      [],
      [],
    );

    expect(result.map((pattern) => pattern.id)).toEqual(["syncopated-funk"]);
  });

  it("sorts favorites and recently used patterns first", () => {
    const favorites = filterAndSortPatterns(
      builtInPatterns,
      defaultPatternFilters,
      "favorites",
      ["one-drop"],
      [],
    );
    const recent = filterAndSortPatterns(
      builtInPatterns,
      defaultPatternFilters,
      "recent",
      [],
      ["train-beat", "basic-pop"],
    );

    expect(favorites[0]?.id).toBe("one-drop");
    expect(recent.slice(0, 2).map((pattern) => pattern.id)).toEqual([
      "train-beat",
      "basic-pop",
    ]);
  });

  it("sorts default BPM from slowest to fastest", () => {
    const result = filterAndSortPatterns(
      builtInPatterns,
      defaultPatternFilters,
      "bpm",
      [],
      [],
    );

    expect(result[0]?.defaultBpm).toBe(58);
    expect(result.at(-1)?.defaultBpm).toBe(150);
  });
});
