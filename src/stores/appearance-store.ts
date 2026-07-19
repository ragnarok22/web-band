import { create } from "zustand";

import { reportPreferenceWrite } from "@/stores/storage-store";
import type {
  AppearancePreferences,
  BeatFlashIntensity,
  ColorTheme,
  VisualSubdivisionDetail,
} from "@/types/persistence";

export type { ColorTheme } from "@/types/persistence";

interface AppearanceStore extends AppearancePreferences {
  hasHydrated: boolean;
  hydrate: () => void;
  replacePreferences: (preferences: AppearancePreferences) => boolean;
  setBeatFlashIntensity: (intensity: BeatFlashIntensity) => void;
  setReducedMotion: (reducedMotion: boolean) => void;
  setTheme: (theme: ColorTheme) => void;
  setVisualSubdivisionDetail: (detail: VisualSubdivisionDetail) => void;
}

export const appearanceStorageKey = "web-band-appearance-v2";
export const legacyAppearanceStorageKeys = ["web-band-appearance-v1"] as const;

export const defaultAppearancePreferences: AppearancePreferences = {
  beatFlashIntensity: "standard",
  reducedMotion: false,
  theme: "dark",
  visualSubdivisionDetail: "pattern",
};

export function isColorTheme(value: unknown): value is ColorTheme {
  return value === "dark" || value === "light" || value === "system";
}

export function isBeatFlashIntensity(
  value: unknown,
): value is BeatFlashIntensity {
  return value === "minimal" || value === "standard" || value === "strong";
}

export function isVisualSubdivisionDetail(
  value: unknown,
): value is VisualSubdivisionDetail {
  return value === "beats" || value === "pattern" || value === "sixteenths";
}

function readPreferences(): AppearancePreferences {
  if (typeof window === "undefined") return defaultAppearancePreferences;

  try {
    const value: unknown = JSON.parse(
      window.localStorage.getItem(appearanceStorageKey) ??
        legacyAppearanceStorageKeys
          .map((key) => window.localStorage.getItem(key))
          .find((stored) => stored !== null) ??
        "null",
    );
    if (!value || typeof value !== "object")
      return defaultAppearancePreferences;
    const record = value as Record<string, unknown>;
    return {
      beatFlashIntensity: isBeatFlashIntensity(record.beatFlashIntensity)
        ? record.beatFlashIntensity
        : defaultAppearancePreferences.beatFlashIntensity,
      reducedMotion:
        typeof record.reducedMotion === "boolean"
          ? record.reducedMotion
          : defaultAppearancePreferences.reducedMotion,
      theme: isColorTheme(record.theme)
        ? record.theme
        : defaultAppearancePreferences.theme,
      visualSubdivisionDetail: isVisualSubdivisionDetail(
        record.visualSubdivisionDetail,
      )
        ? record.visualSubdivisionDetail
        : defaultAppearancePreferences.visualSubdivisionDetail,
    };
  } catch {
    return defaultAppearancePreferences;
  }
}

export function applyAppearancePreferences(
  preferences: AppearancePreferences,
): void {
  if (typeof document === "undefined") return;

  const resolvedTheme =
    preferences.theme === "system"
      ? window.matchMedia?.("(prefers-color-scheme: light)").matches
        ? "light"
        : "dark"
      : preferences.theme;
  document.documentElement.dataset.theme = resolvedTheme;
  document.documentElement.dataset.reduceMotion = String(
    preferences.reducedMotion,
  );
  document
    .querySelector<HTMLMetaElement>('meta[name="theme-color"]')
    ?.setAttribute(
      "content",
      resolvedTheme === "light" ? "#f3eee5" : "#12110f",
    );
}

function persistPreferences(preferences: AppearancePreferences): boolean {
  try {
    window.localStorage.setItem(
      appearanceStorageKey,
      JSON.stringify(preferences),
    );
    return true;
  } catch {
    return false;
  }
}

export const useAppearanceStore = create<AppearanceStore>((set, get) => ({
  ...defaultAppearancePreferences,
  hasHydrated: false,
  hydrate: () => {
    const preferences = readPreferences();
    applyAppearancePreferences(preferences);
    set({ ...preferences, hasHydrated: true });
  },
  replacePreferences: (preferences) => {
    if (
      !isBeatFlashIntensity(preferences.beatFlashIntensity) ||
      !isColorTheme(preferences.theme) ||
      typeof preferences.reducedMotion !== "boolean" ||
      !isVisualSubdivisionDetail(preferences.visualSubdivisionDetail)
    ) {
      throw new Error("Appearance preferences are invalid.");
    }
    const next = structuredClone(preferences);
    applyAppearancePreferences(next);
    set(next);
    const persisted = persistPreferences(next);
    reportPreferenceWrite("appearance", persisted);
    return persisted;
  },
  setBeatFlashIntensity: (beatFlashIntensity) => {
    const preferences = {
      beatFlashIntensity,
      reducedMotion: get().reducedMotion,
      theme: get().theme,
      visualSubdivisionDetail: get().visualSubdivisionDetail,
    };
    const persisted = persistPreferences(preferences);
    reportPreferenceWrite("appearance", persisted);
    set({ beatFlashIntensity });
  },
  setReducedMotion: (reducedMotion) => {
    const preferences = {
      beatFlashIntensity: get().beatFlashIntensity,
      reducedMotion,
      theme: get().theme,
      visualSubdivisionDetail: get().visualSubdivisionDetail,
    };
    applyAppearancePreferences(preferences);
    reportPreferenceWrite("appearance", persistPreferences(preferences));
    set({ reducedMotion });
  },
  setTheme: (theme) => {
    const preferences = {
      beatFlashIntensity: get().beatFlashIntensity,
      reducedMotion: get().reducedMotion,
      theme,
      visualSubdivisionDetail: get().visualSubdivisionDetail,
    };
    applyAppearancePreferences(preferences);
    reportPreferenceWrite("appearance", persistPreferences(preferences));
    set({ theme });
  },
  setVisualSubdivisionDetail: (visualSubdivisionDetail) => {
    const preferences = {
      beatFlashIntensity: get().beatFlashIntensity,
      reducedMotion: get().reducedMotion,
      theme: get().theme,
      visualSubdivisionDetail,
    };
    const persisted = persistPreferences(preferences);
    reportPreferenceWrite("appearance", persisted);
    set({ visualSubdivisionDetail });
  },
}));
