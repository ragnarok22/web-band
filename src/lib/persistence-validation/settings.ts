import { isSoundCharacter } from "@/audio/synthesis/sound-profiles";
import { MAX_BPM, MIN_BPM } from "@/lib/musical-time";
import { isMetronomeConfiguration } from "@/lib/metronome-validation";
import {
  isPracticeMode,
  validateChordTrainerConfiguration,
  validateStrummingPattern,
  validateTempoTrainerConfiguration,
} from "@/lib/practice-validation";
import {
  hasBoundedText,
  hasExactKeys,
  hasUniqueStrings,
  isIntegerInRange,
  isNumberInRange,
  isRecord,
  MAX_ID_LENGTH,
  type PersistenceValidationResult,
} from "./shared";

const MAX_RECENT_PATTERNS = 20;

export function validatePracticeSettings(
  value: unknown,
  version: 1 | 2 | 3 | 4 | 5,
): PersistenceValidationResult {
  const errors: string[] = [];
  if (!isRecord(value))
    return { errors: ["Practice settings must be an object."], success: false };
  if (
    !hasExactKeys(value, [
      "bpm",
      ...(version >= 4 ? ["bpmAdjustmentStep"] : []),
      "countInMeasures",
      "fillFrequency",
      "humanization",
      "masterVolume",
      "mixer",
      ...(version >= 4 ? ["restoreLastPractice"] : []),
      "selectedPatternId",
      ...(version >= 2 ? ["soundCharacter"] : []),
      "swing",
      "wakeLockEnabled",
    ])
  )
    errors.push("Practice settings fields are invalid.");
  if (!isIntegerInRange(value.bpm, MIN_BPM, MAX_BPM))
    errors.push("Practice settings BPM is invalid.");
  if (
    version >= 4 &&
    value.bpmAdjustmentStep !== 1 &&
    value.bpmAdjustmentStep !== 5
  )
    errors.push("Practice settings BPM adjustment step is invalid.");
  if (![0, 1, 2, 4].includes(value.countInMeasures as number))
    errors.push("Practice settings count-in is invalid.");
  if (![null, 4, 8, 16, "random"].includes(value.fillFrequency as never))
    errors.push("Practice settings fill frequency is invalid.");
  if (!isNumberInRange(value.humanization, 0, 1))
    errors.push("Practice settings humanization is invalid.");
  if (!isNumberInRange(value.masterVolume, 0, 1))
    errors.push("Practice settings volume is invalid.");
  if (version >= 4 && typeof value.restoreLastPractice !== "boolean")
    errors.push("Practice settings restore behavior is invalid.");
  if (!hasBoundedText(value.selectedPatternId, MAX_ID_LENGTH))
    errors.push("Practice settings pattern ID is invalid.");
  if (version >= 2 && !isSoundCharacter(value.soundCharacter))
    errors.push("Practice settings sound character is invalid.");
  if (!isNumberInRange(value.swing, 0, 0.65))
    errors.push("Practice settings swing is invalid.");
  if (typeof value.wakeLockEnabled !== "boolean")
    errors.push("Practice settings wake-lock value is invalid.");
  const mixerGroups = [
    "kick",
    "snare",
    "hiHat",
    "toms",
    "cymbals",
    "percussion",
  ] as const;
  if (!isRecord(value.mixer) || !hasExactKeys(value.mixer, mixerGroups)) {
    errors.push("Practice settings mixer is invalid.");
  } else {
    for (const group of mixerGroups) {
      const channel = value.mixer[group];
      if (
        !isRecord(channel) ||
        !hasExactKeys(channel, ["muted", "solo", "volume"]) ||
        typeof channel.muted !== "boolean" ||
        typeof channel.solo !== "boolean" ||
        !isNumberInRange(channel.volume, 0, 1)
      ) {
        errors.push(`Practice settings ${group} mixer channel is invalid.`);
      }
    }
  }
  return { errors, success: errors.length === 0 };
}

export function validateGuidedPracticeSettings(
  value: unknown,
  version: 1 | 2 | 3 | 4 | 5 = 5,
): PersistenceValidationResult {
  const errors: string[] = [];
  if (!isRecord(value))
    return {
      errors: ["Guided practice settings must be an object."],
      success: false,
    };
  if (
    !hasExactKeys(value, [
      "mode",
      "tempoTrainer",
      "chordTrainer",
      "strummingPattern",
      ...(version >= 5 ? ["metronome"] : []),
    ])
  )
    errors.push("Guided practice settings fields are invalid.");
  if (!isPracticeMode(value.mode))
    errors.push("Guided practice settings mode is invalid.");
  if (version < 5 && value.mode === "metronome")
    errors.push("Legacy guided practice mode is invalid.");
  if (version >= 5 && !isMetronomeConfiguration(value.metronome))
    errors.push("Metronome settings are invalid.");
  if (!validateTempoTrainerConfiguration(value.tempoTrainer).success)
    errors.push("Guided practice tempo trainer settings are invalid.");
  if (!validateChordTrainerConfiguration(value.chordTrainer).success)
    errors.push("Guided practice chord trainer settings are invalid.");
  if (!validateStrummingPattern(value.strummingPattern).success)
    errors.push("Guided practice strumming settings are invalid.");
  return { errors, success: errors.length === 0 };
}

export function validateBackupPreferences(
  value: unknown,
  version: 3 | 4,
): PersistenceValidationResult {
  const errors: string[] = [];
  if (!isRecord(value))
    return {
      errors: ["Backup preferences must be an object."],
      success: false,
    };
  if (
    !hasExactKeys(value, [
      "appearance",
      "onboardingDismissed",
      "recentPatternIds",
    ])
  )
    errors.push("Backup preference fields are invalid.");
  if (
    !isRecord(value.appearance) ||
    !hasExactKeys(value.appearance, [
      ...(version >= 4 ? ["beatFlashIntensity"] : []),
      "reducedMotion",
      "theme",
      ...(version >= 4 ? ["visualSubdivisionDetail"] : []),
    ]) ||
    typeof value.appearance.reducedMotion !== "boolean" ||
    !["dark", "light", "system"].includes(value.appearance.theme as string) ||
    (version >= 4 &&
      !["minimal", "standard", "strong"].includes(
        value.appearance.beatFlashIntensity as string,
      )) ||
    (version >= 4 &&
      !["beats", "pattern", "sixteenths"].includes(
        value.appearance.visualSubdivisionDetail as string,
      ))
  ) {
    errors.push("Backup appearance preferences are invalid.");
  }
  if (typeof value.onboardingDismissed !== "boolean")
    errors.push("Backup onboarding preference is invalid.");
  if (
    !Array.isArray(value.recentPatternIds) ||
    value.recentPatternIds.length > MAX_RECENT_PATTERNS ||
    !hasUniqueStrings(value.recentPatternIds)
  ) {
    errors.push("Backup recent pattern preferences are invalid.");
  }
  return { errors, success: errors.length === 0 };
}
