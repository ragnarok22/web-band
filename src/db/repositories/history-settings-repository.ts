import { validateHistorySettings } from "@/lib/persistence-validation";
import {
  defaultHistorySettings,
  isHistoryMinimumDurationSeconds,
} from "@/lib/history-settings";
import type { HistorySettings } from "@/types/persistence";

export const HISTORY_SETTINGS_KEY = "web-band-history-settings-v1";
const HISTORY_SETTINGS_VERSION = 1;

export { defaultHistorySettings } from "@/lib/history-settings";

function isSupportedHistorySettings(value: unknown): value is HistorySettings {
  return (
    validateHistorySettings(value).success &&
    isHistoryMinimumDurationSeconds(
      (value as HistorySettings).minimumDurationSeconds,
    )
  );
}

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
    isSupportedHistorySettings(record.settings)
  );
}

function migrateLegacyZero(value: unknown): HistorySettings | null {
  if (
    typeof value !== "object" ||
    value === null ||
    Array.isArray(value) ||
    Object.keys(value).length !== 2 ||
    !Object.hasOwn(value, "settings") ||
    !Object.hasOwn(value, "version")
  ) {
    return null;
  }
  const record = value as Record<string, unknown>;
  const settings = record.settings;
  if (
    record.version !== HISTORY_SETTINGS_VERSION ||
    typeof settings !== "object" ||
    settings === null ||
    Array.isArray(settings)
  ) {
    return null;
  }
  const legacy = settings as Record<string, unknown>;
  if (
    Object.keys(legacy).length !== 2 ||
    typeof legacy.enabled !== "boolean" ||
    legacy.minimumDurationSeconds !== 0
  ) {
    return null;
  }
  return { enabled: legacy.enabled, minimumDurationSeconds: 1 };
}

export function loadHistorySettings(): HistorySettings {
  if (typeof window === "undefined") return { ...defaultHistorySettings };

  try {
    const rawSettings = window.localStorage.getItem(HISTORY_SETTINGS_KEY);
    if (!rawSettings) return { ...defaultHistorySettings };
    const parsed: unknown = JSON.parse(rawSettings);
    if (isVersionedHistorySettings(parsed)) {
      return structuredClone(parsed.settings);
    }
    return migrateLegacyZero(parsed) ?? { ...defaultHistorySettings };
  } catch {
    return { ...defaultHistorySettings };
  }
}

export function saveHistorySettings(settings: HistorySettings): boolean {
  if (typeof window === "undefined" || !isSupportedHistorySettings(settings)) {
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
