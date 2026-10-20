import type {
  DrumPattern,
  PatternCategory,
  PatternDifficulty,
} from "@/types/pattern";

export type PatternSort = "name" | "bpm" | "recent" | "favorites";
export type PatternQuickFilter =
  "all" | PatternDifficulty | "favorites" | "custom";

export interface PatternFilters {
  category: PatternCategory | "all";
  quickFilter: PatternQuickFilter;
  search: string;
  subdivision: 8 | 16 | "all";
  timeSignature: string | "all";
}

export const defaultPatternFilters: PatternFilters = {
  category: "all",
  quickFilter: "all",
  search: "",
  subdivision: "all",
  timeSignature: "all",
};

export function getTimeSignatureLabel(pattern: DrumPattern): string {
  return `${pattern.timeSignature.numerator}/${pattern.timeSignature.denominator}`;
}

export function filterAndSortPatterns(
  patterns: readonly DrumPattern[],
  filters: PatternFilters,
  sort: PatternSort,
  favoritePatternIds: readonly string[],
  recentPatternIds: readonly string[],
): DrumPattern[] {
  const query = filters.search.trim().toLocaleLowerCase();
  const favorites = new Set(favoritePatternIds);
  const recentRank = new Map(
    recentPatternIds.map((patternId, index) => [patternId, index]),
  );

  return patterns
    .filter((pattern) => {
      const matchesSearch =
        query === "" ||
        pattern.name.toLocaleLowerCase().includes(query) ||
        formatPatternCategory(pattern.category)
          .toLocaleLowerCase()
          .includes(query) ||
        pattern.description.toLocaleLowerCase().includes(query);
      const matchesCategory =
        filters.category === "all" || pattern.category === filters.category;
      const matchesQuickFilter =
        filters.quickFilter === "all" ||
        (filters.quickFilter === "favorites"
          ? favorites.has(pattern.id)
          : filters.quickFilter === "custom"
            ? !pattern.isBuiltIn
            : pattern.difficulty === filters.quickFilter);
      const matchesSubdivision =
        filters.subdivision === "all" ||
        pattern.subdivision === filters.subdivision;
      const matchesTimeSignature =
        filters.timeSignature === "all" ||
        getTimeSignatureLabel(pattern) === filters.timeSignature;

      return (
        matchesSearch &&
        matchesCategory &&
        matchesQuickFilter &&
        matchesSubdivision &&
        matchesTimeSignature
      );
    })
    .sort((left, right) => {
      if (sort === "bpm") {
        return (
          left.defaultBpm - right.defaultBpm ||
          left.name.localeCompare(right.name)
        );
      }
      if (sort === "favorites") {
        return (
          Number(favorites.has(right.id)) - Number(favorites.has(left.id)) ||
          left.name.localeCompare(right.name)
        );
      }
      if (sort === "recent") {
        const leftRank = recentRank.get(left.id) ?? Number.MAX_SAFE_INTEGER;
        const rightRank = recentRank.get(right.id) ?? Number.MAX_SAFE_INTEGER;
        return leftRank - rightRank || left.name.localeCompare(right.name);
      }
      return left.name.localeCompare(right.name);
    });
}

export function formatPatternCategory(category: PatternCategory): string {
  return category === "custom"
    ? "Utility"
    : `${category.charAt(0).toUpperCase()}${category.slice(1)}`;
}
