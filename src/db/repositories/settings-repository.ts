import { clampBpm } from "@/lib/musical-time";
import {
  clampUnit,
  createDefaultMixerSettings,
  mixerGroups,
} from "@/lib/mixer";
import type {
  CountInMeasures,
  FillFrequency,
  MixerSettings,
} from "@/types/audio";
import type { PracticeSettings } from "@/types/persistence";

const SETTINGS_KEY = "web-band-practice-settings-v2";
const LEGACY_SETTINGS_KEY = "web-band-practice-settings-v1";

export const defaultPracticeSettings: PracticeSettings = {
  bpm: 90,
  countInMeasures: 1,
  fillFrequency: null,
  humanization: 0,
  masterVolume: 0.8,
  mixer: createDefaultMixerSettings(),
  selectedPatternId: "basic-rock",
  swing: 0,
  wakeLockEnabled: true,
};

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

export function loadPracticeSettings(): PracticeSettings {
  if (typeof window === "undefined") {
    return defaultPracticeSettings;
  }

  try {
    const rawSettings =
      window.localStorage.getItem(SETTINGS_KEY) ??
      window.localStorage.getItem(LEGACY_SETTINGS_KEY);
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
      countInMeasures: parseCountIn(parsed.countInMeasures),
      fillFrequency: parseFillFrequency(parsed.fillFrequency),
      humanization:
        typeof parsed.humanization === "number"
          ? clampUnit(parsed.humanization)
          : defaultPracticeSettings.humanization,
      masterVolume:
        typeof parsed.masterVolume === "number" &&
        Number.isFinite(parsed.masterVolume) &&
        parsed.masterVolume >= 0 &&
        parsed.masterVolume <= 1
          ? parsed.masterVolume
          : defaultPracticeSettings.masterVolume,
      mixer: parseMixer(parsed.mixer),
      selectedPatternId:
        typeof parsed.selectedPatternId === "string" &&
        parsed.selectedPatternId.trim()
          ? parsed.selectedPatternId
          : defaultPracticeSettings.selectedPatternId,
      swing:
        typeof parsed.swing === "number"
          ? Math.min(0.65, Math.max(0, parsed.swing))
          : defaultPracticeSettings.swing,
      wakeLockEnabled:
        typeof parsed.wakeLockEnabled === "boolean"
          ? parsed.wakeLockEnabled
          : defaultPracticeSettings.wakeLockEnabled,
    };
  } catch {
    return defaultPracticeSettings;
  }
}

function parseCountIn(value: unknown): CountInMeasures {
  return value === 0 || value === 1 || value === 2 || value === 4 ? value : 1;
}

function parseFillFrequency(value: unknown): FillFrequency {
  return value === 4 || value === 8 || value === 16 || value === "random"
    ? value
    : null;
}

function parseMixer(value: unknown): MixerSettings {
  const defaults = createDefaultMixerSettings();
  if (!isRecord(value)) return defaults;

  for (const group of mixerGroups) {
    const channel = value[group];
    if (!isRecord(channel)) continue;
    defaults[group] = {
      muted:
        typeof channel.muted === "boolean"
          ? channel.muted
          : defaults[group].muted,
      solo:
        typeof channel.solo === "boolean" ? channel.solo : defaults[group].solo,
      volume:
        typeof channel.volume === "number"
          ? clampUnit(channel.volume)
          : defaults[group].volume,
    };
  }

  return defaults;
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
