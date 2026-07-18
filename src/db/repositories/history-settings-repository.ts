import { validateHistorySettings } from "@/lib/persistence-validation";
import type { HistorySettings } from "@/types/persistence";

export const HISTORY_SETTINGS_KEY = "web-band-history-settings-v1";
const HISTORY_SETTINGS_VERSION = 1;

export const defaultHistorySettings: HistorySettings = {
  enabled: true,
  minimumDurationSeconds: 30,
};

function isVersionedHistorySettings(
  value: unknown,
): value is { settings: HistorySettings; version: 1 } {
  if (typeof value !== "object" || value === null || Array.isArray(value)) {
    return false;
  }
  const record = value as Record<string, unknown>;
  return (
    Object.keys(record).length === 2 &&
    Object.hasOwn(record, "settings") &&
    Object.hasOwn(record, "version") &&
    record.version === HISTORY_SETTINGS_VERSION &&
    validateHistorySettings(record.settings).success
  );
}

export function loadHistorySettings(): HistorySettings {
  if (typeof window === "undefined") return { ...defaultHistorySettings };

  try {
    const rawSettings = window.localStorage.getItem(HISTORY_SETTINGS_KEY);
    if (!rawSettings) return { ...defaultHistorySettings };
    const parsed: unknown = JSON.parse(rawSettings);
    return isVersionedHistorySettings(parsed)
      ? structuredClone(parsed.settings)
      : { ...defaultHistorySettings };
  } catch {
    return { ...defaultHistorySettings };
  }
}

export function saveHistorySettings(settings: HistorySettings): boolean {
  if (
    typeof window === "undefined" ||
    !validateHistorySettings(settings).success
  ) {
    return false;
  }

  try {
    window.localStorage.setItem(
      HISTORY_SETTINGS_KEY,
      JSON.stringify({ settings, version: HISTORY_SETTINGS_VERSION }),
    );
    return true;
  } catch {
    return false;
  }
}
