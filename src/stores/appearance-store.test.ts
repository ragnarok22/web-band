import { beforeEach, describe, expect, it, vi } from "vitest";

import {
  appearanceStorageKey,
  defaultAppearancePreferences,
  useAppearanceStore,
} from "@/stores/appearance-store";

describe("appearance store", () => {
  beforeEach(() => {
    useAppearanceStore.setState({
      ...defaultAppearancePreferences,
      hasHydrated: false,
    });
  });

  it("hydrates validated preferences and applies the resolved system theme", () => {
    vi.stubGlobal(
      "matchMedia",
      vi.fn(() => ({ matches: true })),
    );
    window.localStorage.setItem(
      appearanceStorageKey,
      JSON.stringify({ reducedMotion: true, theme: "system" }),
    );

    useAppearanceStore.getState().hydrate();

    expect(useAppearanceStore.getState()).toMatchObject({
      hasHydrated: true,
      reducedMotion: true,
      theme: "system",
    });
    expect(document.documentElement.dataset.theme).toBe("light");
    expect(document.documentElement.dataset.reduceMotion).toBe("true");
    vi.unstubAllGlobals();
  });

  it("persists changes and falls back from malformed storage", () => {
    window.localStorage.setItem(appearanceStorageKey, "not-json");
    useAppearanceStore.getState().hydrate();
    expect(useAppearanceStore.getState()).toMatchObject(
      defaultAppearancePreferences,
    );

    useAppearanceStore.getState().setTheme("light");
    useAppearanceStore.getState().setReducedMotion(true);

    expect(
      JSON.parse(window.localStorage.getItem(appearanceStorageKey)!),
    ).toEqual({ reducedMotion: true, theme: "light" });
  });
});
