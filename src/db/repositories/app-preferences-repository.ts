import { ONBOARDING_STORAGE_KEY } from "@/db/repositories/onboarding-preferences-repository";
import { RECENT_PATTERNS_KEY } from "@/db/repositories/pattern-preferences-repository";
import {
  LEGACY_SETTINGS_KEYS,
  SETTINGS_KEY,
} from "@/db/repositories/settings-repository";
import {
  appearanceStorageKey,
  legacyAppearanceStorageKeys,
} from "@/stores/appearance-store";
import { GUIDED_PRACTICE_STORAGE_KEY } from "@/stores/guided-practice-store";
import { HISTORY_SETTINGS_KEY } from "@/db/repositories/history-settings-repository";

export const webBandPreferenceKeys = [
  SETTINGS_KEY,
  ...LEGACY_SETTINGS_KEYS,
  GUIDED_PRACTICE_STORAGE_KEY,
  HISTORY_SETTINGS_KEY,
  RECENT_PATTERNS_KEY,
  appearanceStorageKey,
  ...legacyAppearanceStorageKeys,
  ONBOARDING_STORAGE_KEY,
] as const;

export function clearAllAppPreferenceKeys(): boolean {
  if (typeof window === "undefined") return false;

  let cleared = true;
  for (const key of webBandPreferenceKeys) {
    try {
      window.localStorage.removeItem(key);
    } catch {
      cleared = false;
    }
  }
  return cleared;
}
