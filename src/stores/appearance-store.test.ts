import { beforeEach, describe, expect, it, vi } from "vitest";

import {
  appearanceStorageKey,
  defaultAppearancePreferences,
  legacyAppearanceStorageKeys,
  useAppearanceStore,
} from "@/stores/appearance-store";
import { useStorageStore } from "@/stores/storage-store";

describe("appearance store", () => {
  beforeEach(() => {
    useAppearanceStore.setState({
      ...defaultAppearancePreferences,
      hasHydrated: false,
    });
    useStorageStore.setState({ preferenceWriteFailures: [] });
  });

  it("hydrates validated preferences and applies the resolved system theme", () => {
    vi.stubGlobal(
      "matchMedia",
      vi.fn(() => ({ matches: true })),
    );
    window.localStorage.setItem(
      legacyAppearanceStorageKeys[0],
      JSON.stringify({ reducedMotion: true, theme: "system" }),
    );

    useAppearanceStore.getState().hydrate();

    expect(useAppearanceStore.getState()).toMatchObject({
      hasHydrated: true,
      beatFlashIntensity: "standard",
      reducedMotion: true,
      theme: "system",
      visualSubdivisionDetail: "pattern",
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
    ).toEqual({
      beatFlashIntensity: "standard",
      reducedMotion: true,
      theme: "light",
      visualSubdivisionDetail: "pattern",
    });
  });

  it("persists visual detail and beat intensity", () => {
    useAppearanceStore.getState().setVisualSubdivisionDetail("sixteenths");
    useAppearanceStore.getState().setBeatFlashIntensity("strong");

    expect(
      JSON.parse(window.localStorage.getItem(appearanceStorageKey)!),
    ).toEqual({
      beatFlashIntensity: "strong",
      reducedMotion: false,
      theme: "dark",
      visualSubdivisionDetail: "sixteenths",
    });
  });

  it("applies appearance for the visit and reports failed persistence", () => {
    vi.spyOn(Storage.prototype, "setItem").mockImplementation(() => {
      throw new Error("blocked");
    });

    useAppearanceStore.getState().setTheme("light");

    expect(document.documentElement.dataset.theme).toBe("light");
    expect(useStorageStore.getState().preferenceWriteFailures).toContain(
      "appearance",
    );
  });
});
