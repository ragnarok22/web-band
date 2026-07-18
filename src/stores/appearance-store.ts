import { create } from "zustand";

export type ColorTheme = "dark" | "light" | "system";

interface AppearancePreferences {
  reducedMotion: boolean;
  theme: ColorTheme;
}

interface AppearanceStore extends AppearancePreferences {
  hasHydrated: boolean;
  hydrate: () => void;
  setReducedMotion: (reducedMotion: boolean) => void;
  setTheme: (theme: ColorTheme) => void;
}

export const appearanceStorageKey = "web-band-appearance-v1";

export const defaultAppearancePreferences: AppearancePreferences = {
  reducedMotion: false,
  theme: "dark",
};

function isColorTheme(value: unknown): value is ColorTheme {
  return value === "dark" || value === "light" || value === "system";
}

function readPreferences(): AppearancePreferences {
  if (typeof window === "undefined") return defaultAppearancePreferences;

  try {
    const value: unknown = JSON.parse(
      window.localStorage.getItem(appearanceStorageKey) ?? "null",
    );
    if (!value || typeof value !== "object")
      return defaultAppearancePreferences;
    const record = value as Record<string, unknown>;
    return {
      reducedMotion:
        typeof record.reducedMotion === "boolean"
          ? record.reducedMotion
          : defaultAppearancePreferences.reducedMotion,
      theme: isColorTheme(record.theme)
        ? record.theme
        : defaultAppearancePreferences.theme,
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

function persistPreferences(preferences: AppearancePreferences): void {
  try {
    window.localStorage.setItem(
      appearanceStorageKey,
      JSON.stringify(preferences),
    );
  } catch {
    // Appearance changes still apply for this visit when storage is unavailable.
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
  setReducedMotion: (reducedMotion) => {
    const preferences = { reducedMotion, theme: get().theme };
    applyAppearancePreferences(preferences);
    persistPreferences(preferences);
    set({ reducedMotion });
  },
  setTheme: (theme) => {
    const preferences = { reducedMotion: get().reducedMotion, theme };
    applyAppearancePreferences(preferences);
    persistPreferences(preferences);
    set({ theme });
  },
}));
