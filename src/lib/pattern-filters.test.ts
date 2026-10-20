import { describe, expect, it } from "vitest";

import { builtInPatterns } from "@/data/patterns";
import {
  defaultPatternFilters,
  filterAndSortPatterns,
} from "@/lib/pattern-filters";

describe("pattern filters", () => {
  it("recommends the existing rock, pop, and straight blues foundations first", () => {
    const patterns = [...builtInPatterns].reverse();
    const result = filterAndSortPatterns(
      patterns,
      defaultPatternFilters,
      "recommended",
      [],
      [],
    );
    expect(result.slice(0, 3).map(({ id }) => id)).toEqual([
      "basic-rock",
      "basic-pop",
      "straight-blues",
    ]);
    expect(new Set(result.map(({ id }) => id)).size).toBe(
      builtInPatterns.length,
    );
    expect(patterns).toEqual([...builtInPatterns].reverse());
    const remainingFoundations = result
      .slice(3)
      .filter(
        (pattern) =>
          pattern.difficulty === "beginner" &&
          pattern.timeSignature.numerator === 4 &&
          pattern.timeSignature.denominator === 4 &&
          pattern.subdivision === 8 &&
          pattern.bars === 1,
      );
    expect(result.slice(3, 3 + remainingFoundations.length)).toEqual(
      remainingFoundations,
    );
  });

  it("keeps recommendations compatible with filtering, custom patterns, and explicit alphabetical sorting", () => {
    const custom = {
      ...builtInPatterns[0],
      id: "custom-foundation",
      name: "A custom foundation",
      isBuiltIn: false,
    };
    const patterns = [...builtInPatterns, custom];
    const recommended = filterAndSortPatterns(
      patterns,
      { ...defaultPatternFilters, category: "blues" },
      "recommended",
      [],
      [],
    );
    expect(recommended[0]?.id).toBe("straight-blues");
    expect(recommended.every(({ category }) => category === "blues")).toBe(
      true,
    );
    const alphabetical = filterAndSortPatterns(
      patterns,
      defaultPatternFilters,
      "name",
      [],
      [],
    );
    expect(alphabetical).toEqual(
      [...patterns].sort((a, b) => a.name.localeCompare(b.name)),
    );
    expect(
      filterAndSortPatterns(
        patterns,
        defaultPatternFilters,
        "recommended",
        [],
        [],
      ),
    ).toContain(custom);
  });

  it("filters by search, category, difficulty, meter, and grid", () => {
    const result = filterAndSortPatterns(
      builtInPatterns,
      {
        category: "funk",
        quickFilter: "advanced",
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

  it("matches genre names even when not mentioned in the name or description", () => {
    const pattern = {
      ...builtInPatterns[0],
      name: "Pocket",
      description: "A steady rhythm.",
      category: "funk" as const,
    };
    expect(
      filterAndSortPatterns(
        [pattern],
        { ...defaultPatternFilters, search: "funk" },
        "name",
        [],
        [],
      ),
    ).toEqual([pattern]);
  });

  it("uses ownership rather than genre for My Patterns and favorite IDs for Favorites", () => {
    const custom = {
      ...builtInPatterns[0],
      id: "my-rock",
      category: "rock" as const,
      isBuiltIn: false,
    };
    const patterns = [...builtInPatterns, custom];
    expect(
      filterAndSortPatterns(
        patterns,
        { ...defaultPatternFilters, quickFilter: "custom" },
        "name",
        [],
        [],
      ),
    ).toEqual([custom]);
    expect(
      filterAndSortPatterns(
        patterns,
        { ...defaultPatternFilters, quickFilter: "favorites" },
        "name",
        [custom.id],
        [],
      ),
    ).toEqual([custom]);
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
