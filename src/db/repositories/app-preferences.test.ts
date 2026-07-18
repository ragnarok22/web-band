import { describe, expect, it } from "vitest";

import {
  clearOnboardingDismissal,
  ONBOARDING_STORAGE_KEY,
  saveOnboardingDismissal,
} from "@/db/repositories/onboarding-preferences-repository";
import {
  clearRecentPatternIds,
  RECENT_PATTERNS_KEY,
  saveRecentPatternIds,
} from "@/db/repositories/pattern-preferences-repository";

describe("app preferences cleanup", () => {
  it("clears only recent-pattern and onboarding keys", () => {
    window.localStorage.setItem("unrelated-origin-key", "keep me");
    expect(saveRecentPatternIds(["basic-rock"])).toBe(true);
    expect(saveOnboardingDismissal()).toBe(true);

    expect(clearRecentPatternIds()).toBe(true);
    expect(clearOnboardingDismissal()).toBe(true);

    expect(window.localStorage.getItem(RECENT_PATTERNS_KEY)).toBeNull();
    expect(window.localStorage.getItem(ONBOARDING_STORAGE_KEY)).toBeNull();
    expect(window.localStorage.getItem("unrelated-origin-key")).toBe("keep me");
  });
});
