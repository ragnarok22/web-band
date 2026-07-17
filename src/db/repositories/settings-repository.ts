import { clampBpm } from "@/lib/musical-time";
import type { PracticeSettings } from "@/types/persistence";

const SETTINGS_KEY = "web-band-practice-settings-v1";

export const defaultPracticeSettings: PracticeSettings = {
  bpm: 90,
  masterVolume: 0.8,
  selectedPatternId: "basic-rock",
};

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

export function loadPracticeSettings(): PracticeSettings {
  if (typeof window === "undefined") {
    return defaultPracticeSettings;
  }

  try {
    const rawSettings = window.localStorage.getItem(SETTINGS_KEY);
    const parsed: unknown = rawSettings ? JSON.parse(rawSettings) : null;

    if (!isRecord(parsed)) {
      return defaultPracticeSettings;
    }

    return {
      bpm: clampBpm(
        typeof parsed.bpm === "number"
          ? parsed.bpm
          : defaultPracticeSettings.bpm,
      ),
      masterVolume:
        typeof parsed.masterVolume === "number" &&
        parsed.masterVolume >= 0 &&
        parsed.masterVolume <= 1
          ? parsed.masterVolume
          : defaultPracticeSettings.masterVolume,
      selectedPatternId:
        typeof parsed.selectedPatternId === "string" &&
        parsed.selectedPatternId.trim()
          ? parsed.selectedPatternId
          : defaultPracticeSettings.selectedPatternId,
    };
  } catch {
    return defaultPracticeSettings;
  }
}

export function savePracticeSettings(settings: PracticeSettings): boolean {
  if (typeof window === "undefined") {
    return false;
  }

  try {
    window.localStorage.setItem(SETTINGS_KEY, JSON.stringify(settings));
    return true;
  } catch {
    return false;
  }
}
