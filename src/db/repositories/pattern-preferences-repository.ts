export const RECENT_PATTERNS_KEY = "web-band-recent-patterns-v1";
const MAX_RECENT_PATTERNS = 20;

export function loadRecentPatternIds(): string[] {
  if (typeof window === "undefined") {
    return [];
  }

  try {
    const value: unknown = JSON.parse(
      window.localStorage.getItem(RECENT_PATTERNS_KEY) ?? "[]",
    );
    if (!Array.isArray(value)) {
      return [];
    }

    return value
      .filter((patternId): patternId is string => typeof patternId === "string")
      .slice(0, MAX_RECENT_PATTERNS);
  } catch {
    return [];
  }
}

export function saveRecentPatternIds(patternIds: readonly string[]): boolean {
  if (typeof window === "undefined") {
    return false;
  }

  try {
    window.localStorage.setItem(
      RECENT_PATTERNS_KEY,
      JSON.stringify(patternIds.slice(0, MAX_RECENT_PATTERNS)),
    );
    return true;
  } catch {
    return false;
  }
}

export function clearRecentPatternIds(): boolean {
  if (typeof window === "undefined") return false;
  try {
    window.localStorage.removeItem(RECENT_PATTERNS_KEY);
    return true;
  } catch {
    return false;
  }
}
