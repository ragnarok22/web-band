import { builtInChordProgressions } from "@/data/chord-progressions";
import { builtInPatterns } from "@/data/patterns";
import { builtInStrummingPatterns } from "@/data/strumming-patterns";
import { isSoundCharacter } from "@/audio/synthesis/sound-profiles";
import {
  MAX_HISTORY_MINIMUM_DURATION_SECONDS,
  MIN_HISTORY_MINIMUM_DURATION_SECONDS,
} from "@/lib/history-settings";
import { MAX_BPM, MIN_BPM } from "@/lib/musical-time";
import { validatePattern } from "@/lib/pattern-validation";
import {
  isPracticeMode,
  validateChordTrainerConfiguration,
  validateCustomChordProgression,
  validatePracticePreset,
  validateStrummingPattern,
  validateTempoTrainerConfiguration,
} from "@/lib/practice-validation";
import { isCanonicalUtcIsoTimestamp } from "@/lib/timestamp-validation";
import type {
  VersionedBackupEnvelope,
  CustomDrumPattern,
  CustomStrummingPattern,
  HistorySettings,
  PracticeSession,
} from "@/types/persistence";

export { isCanonicalUtcIsoTimestamp } from "@/lib/timestamp-validation";

export interface PersistenceValidationResult {
  success: boolean;
  errors: string[];
}

export const MAX_BACKUP_COLLECTION_RECORDS = 10_000;
export const MAX_BACKUP_TOTAL_RECORDS = 25_000;

const MAX_ID_LENGTH = 128;
const MAX_NAME_LENGTH = 100;
const MAX_DESCRIPTION_LENGTH = 1_000;
const MAX_CATEGORY_LENGTH = 64;
const MAX_TIME_SIGNATURE_LENGTH = 16;
const MAX_PATTERN_HITS = 2_048;
const MAX_SESSION_DURATION_SECONDS = 86_400;
const MAX_RECENT_PATTERNS = 20;

const builtInPatternIds = new Set(builtInPatterns.map(({ id }) => id));
const builtInChordProgressionIds = new Set(
  builtInChordProgressions.map(({ id }) => id),
);
const builtInStrummingPatternIds = new Set(
  builtInStrummingPatterns.map(({ id }) => id),
);

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function hasBoundedText(
  value: unknown,
  maximumLength: number,
): value is string {
  return (
    typeof value === "string" &&
    value.trim() !== "" &&
    value.length <= maximumLength
  );
}

function hasOnlyKeys(
  value: Record<string, unknown>,
  allowedKeys: readonly string[],
): boolean {
  const allowed = new Set(allowedKeys);
  return Object.keys(value).every((key) => allowed.has(key));
}

function hasExactKeys(
  value: Record<string, unknown>,
  expectedKeys: readonly string[],
): boolean {
  return (
    Object.keys(value).length === expectedKeys.length &&
    expectedKeys.every((key) => Object.hasOwn(value, key))
  );
}

function isIntegerInRange(value: unknown, minimum: number, maximum: number) {
  return (
    typeof value === "number" &&
    Number.isInteger(value) &&
    value >= minimum &&
    value <= maximum
  );
}

function isNumberInRange(value: unknown, minimum: number, maximum: number) {
  return (
    typeof value === "number" &&
    Number.isFinite(value) &&
    value >= minimum &&
    value <= maximum
  );
}

function timestampsAreOrdered(createdAt: unknown, updatedAt: unknown): boolean {
  return (
    isCanonicalUtcIsoTimestamp(createdAt) &&
    isCanonicalUtcIsoTimestamp(updatedAt) &&
    Date.parse(updatedAt) >= Date.parse(createdAt)
  );
}

function hasUniqueStrings(values: readonly unknown[]): boolean {
  return (
    values.every((value) => hasBoundedText(value, MAX_ID_LENGTH)) &&
    new Set(values).size === values.length
  );
}

function hasUniqueIds(values: readonly unknown[]): boolean {
  const ids: string[] = [];
  for (const value of values) {
    if (!isRecord(value) || !hasBoundedText(value.id, MAX_ID_LENGTH)) {
      return false;
    }
    ids.push(value.id);
  }
  return new Set(ids).size === values.length;
}

function validateCollection(
  value: unknown,
  name: string,
  validator: (entry: unknown) => PersistenceValidationResult,
  errors: string[],
): value is unknown[] {
  if (!Array.isArray(value)) {
    errors.push(`${name} must be an array.`);
    return false;
  }
  if (value.length > MAX_BACKUP_COLLECTION_RECORDS) {
    errors.push(
      `${name} cannot contain more than ${MAX_BACKUP_COLLECTION_RECORDS} records.`,
    );
    return false;
  }
  if (!hasUniqueIds(value)) {
    errors.push(`${name} IDs must be valid and unique.`);
    return false;
  }
  if (!value.every((entry) => validator(entry).success)) {
    errors.push(`${name} contains an invalid record.`);
    return false;
  }
  return true;
}

export function validateCustomDrumPattern(
  value: unknown,
): PersistenceValidationResult {
  const hasTooManyHits =
    isRecord(value) &&
    Array.isArray(value.hits) &&
    value.hits.length > MAX_PATTERN_HITS;
  const baseResult = hasTooManyHits
    ? { errors: [], success: false }
    : validatePattern(value);
  const errors = [...baseResult.errors];

  if (!isRecord(value)) {
    return { errors, success: false };
  }

  if (
    !hasOnlyKeys(value, [
      "id",
      "name",
      "description",
      "category",
      "difficulty",
      "timeSignature",
      "subdivision",
      "bars",
      "defaultBpm",
      "recommendedBpmRange",
      "swing",
      "hits",
      "isBuiltIn",
      "createdAt",
      "updatedAt",
    ])
  ) {
    errors.push("Custom drum pattern contains unsupported fields.");
  }
  if (!hasBoundedText(value.id, MAX_ID_LENGTH))
    errors.push("Custom drum pattern ID is invalid.");
  if (typeof value.id === "string" && builtInPatternIds.has(value.id))
    errors.push("Custom drum pattern ID conflicts with a built-in pattern.");
  if (!hasBoundedText(value.name, MAX_NAME_LENGTH))
    errors.push("Custom drum pattern name is invalid.");
  if (
    typeof value.description !== "string" ||
    value.description.length > MAX_DESCRIPTION_LENGTH
  ) {
    errors.push("Custom drum pattern description is too long.");
  }
  if (value.isBuiltIn !== false)
    errors.push("Custom drum pattern must not be built in.");
  if (!isCanonicalUtcIsoTimestamp(value.createdAt))
    errors.push("Custom drum pattern creation date is required.");
  if (!isCanonicalUtcIsoTimestamp(value.updatedAt))
    errors.push("Custom drum pattern update date is required.");
  if (
    isCanonicalUtcIsoTimestamp(value.createdAt) &&
    isCanonicalUtcIsoTimestamp(value.updatedAt) &&
    !timestampsAreOrdered(value.createdAt, value.updatedAt)
  ) {
    errors.push("Custom drum pattern update date cannot precede creation.");
  }
  if (value.swing !== undefined && !isNumberInRange(value.swing, 0, 0.65)) {
    errors.push("Custom drum pattern swing is invalid.");
  }
  if (Array.isArray(value.hits)) {
    if (hasTooManyHits) {
      errors.push("Custom drum pattern contains too many hits.");
    } else {
      const hitIds = value.hits.map((hit) =>
        isRecord(hit) ? hit.id : undefined,
      );
      if (!hasUniqueStrings(hitIds))
        errors.push("Custom drum pattern hit IDs must be valid and unique.");
      const cells = value.hits.flatMap((hit) =>
        isRecord(hit) &&
        typeof hit.instrument === "string" &&
        Number.isInteger(hit.step)
          ? [`${hit.instrument}:${hit.step}`]
          : [],
      );
      if (new Set(cells).size !== cells.length) {
        errors.push(
          "Custom drum pattern hits must use unique instrument cells.",
        );
      }
    }
  }

  return { errors, success: errors.length === 0 };
}

export function validateCustomStrummingPattern(
  value: unknown,
): PersistenceValidationResult {
  const baseResult = validateStrummingPattern(value);
  const errors = [...baseResult.errors];

  if (!isRecord(value)) {
    return { errors, success: false };
  }

  if (
    !hasOnlyKeys(value, [
      "id",
      "name",
      "timeSignature",
      "subdivision",
      "steps",
      "isBuiltIn",
      "createdAt",
      "updatedAt",
    ])
  ) {
    errors.push("Custom strumming pattern contains unsupported fields.");
  }
  if (!hasBoundedText(value.id, MAX_ID_LENGTH))
    errors.push("Custom strumming pattern ID is invalid.");
  if (typeof value.id === "string" && builtInStrummingPatternIds.has(value.id))
    errors.push(
      "Custom strumming pattern ID conflicts with a built-in pattern.",
    );
  if (!hasBoundedText(value.name, MAX_NAME_LENGTH))
    errors.push("Custom strumming pattern name is invalid.");
  if (value.isBuiltIn !== false)
    errors.push("Custom strumming pattern must not be built in.");
  if (!isCanonicalUtcIsoTimestamp(value.createdAt))
    errors.push("Custom strumming pattern creation date is required.");
  if (!isCanonicalUtcIsoTimestamp(value.updatedAt))
    errors.push("Custom strumming pattern update date is required.");
  if (
    isCanonicalUtcIsoTimestamp(value.createdAt) &&
    isCanonicalUtcIsoTimestamp(value.updatedAt) &&
    !timestampsAreOrdered(value.createdAt, value.updatedAt)
  ) {
    errors.push(
      "Custom strumming pattern update date cannot precede creation.",
    );
  }
  if (Array.isArray(value.steps)) {
    const stepIds = value.steps.map((step) =>
      isRecord(step) ? step.id : undefined,
    );
    if (!hasUniqueStrings(stepIds))
      errors.push(
        "Custom strumming pattern step IDs must be valid and unique.",
      );
  }

  return { errors, success: errors.length === 0 };
}

export function validatePracticeSession(
  value: unknown,
): PersistenceValidationResult {
  const errors: string[] = [];
  if (!isRecord(value)) {
    return { errors: ["Practice session must be an object."], success: false };
  }

  if (
    !hasExactKeys(value, [
      "id",
      "startedAt",
      "endedAt",
      "durationSeconds",
      "patternId",
      "patternName",
      "category",
      "startingBpm",
      "endingBpm",
      "timeSignature",
      "practiceMode",
      "createdAt",
      "updatedAt",
    ])
  ) {
    errors.push("Practice session fields are invalid.");
  }
  if (!hasBoundedText(value.id, MAX_ID_LENGTH))
    errors.push("Practice session ID is invalid.");
  if (!isCanonicalUtcIsoTimestamp(value.startedAt))
    errors.push("Practice session start date is invalid.");
  if (!isCanonicalUtcIsoTimestamp(value.endedAt))
    errors.push("Practice session end date is invalid.");
  if (
    isCanonicalUtcIsoTimestamp(value.startedAt) &&
    isCanonicalUtcIsoTimestamp(value.endedAt) &&
    Date.parse(value.endedAt) < Date.parse(value.startedAt)
  ) {
    errors.push("Practice session cannot end before it starts.");
  }
  if (
    !isIntegerInRange(value.durationSeconds, 1, MAX_SESSION_DURATION_SECONDS)
  ) {
    errors.push("Practice session duration is invalid.");
  }
  if (
    typeof value.durationSeconds === "number" &&
    isCanonicalUtcIsoTimestamp(value.startedAt) &&
    isCanonicalUtcIsoTimestamp(value.endedAt) &&
    value.durationSeconds >
      Math.ceil(
        (Date.parse(value.endedAt) - Date.parse(value.startedAt)) / 1_000,
      )
  ) {
    errors.push("Practice session duration cannot exceed elapsed time.");
  }
  if (!hasBoundedText(value.patternId, MAX_ID_LENGTH))
    errors.push("Practice session pattern ID is invalid.");
  if (!hasBoundedText(value.patternName, MAX_NAME_LENGTH))
    errors.push("Practice session pattern name is invalid.");
  if (!hasBoundedText(value.category, MAX_CATEGORY_LENGTH))
    errors.push("Practice session category is invalid.");
  if (!isIntegerInRange(value.startingBpm, MIN_BPM, MAX_BPM))
    errors.push("Practice session starting BPM is invalid.");
  if (!isIntegerInRange(value.endingBpm, MIN_BPM, MAX_BPM))
    errors.push("Practice session ending BPM is invalid.");
  if (
    !hasBoundedText(value.timeSignature, MAX_TIME_SIGNATURE_LENGTH) ||
    !/^\d{1,2}\/(?:4|8)$/.test(value.timeSignature)
  ) {
    errors.push("Practice session time signature is invalid.");
  }
  if (!isPracticeMode(value.practiceMode))
    errors.push("Practice session mode is invalid.");
  if (!isCanonicalUtcIsoTimestamp(value.createdAt))
    errors.push("Practice session creation date is invalid.");
  if (!isCanonicalUtcIsoTimestamp(value.updatedAt))
    errors.push("Practice session update date is invalid.");
  if (
    isCanonicalUtcIsoTimestamp(value.createdAt) &&
    isCanonicalUtcIsoTimestamp(value.updatedAt) &&
    !timestampsAreOrdered(value.createdAt, value.updatedAt)
  ) {
    errors.push("Practice session update date cannot precede creation.");
  }

  return { errors, success: errors.length === 0 };
}

export function validateHistorySettings(
  value: unknown,
  minimumDurationSeconds = MIN_HISTORY_MINIMUM_DURATION_SECONDS,
): PersistenceValidationResult {
  const errors: string[] = [];
  if (!isRecord(value)) {
    return { errors: ["History settings must be an object."], success: false };
  }
  if (!hasExactKeys(value, ["enabled", "minimumDurationSeconds"]))
    errors.push("History settings fields are invalid.");
  if (typeof value.enabled !== "boolean")
    errors.push("History enabled setting is invalid.");
  if (
    !isIntegerInRange(
      value.minimumDurationSeconds,
      minimumDurationSeconds,
      MAX_HISTORY_MINIMUM_DURATION_SECONDS,
    )
  ) {
    errors.push("History minimum duration is invalid.");
  }
  return { errors, success: errors.length === 0 };
}

function validatePracticeSettings(
  value: unknown,
  version: 1 | 2 | 3 | 4,
): PersistenceValidationResult {
  const errors: string[] = [];
  if (!isRecord(value)) {
    return { errors: ["Practice settings must be an object."], success: false };
  }
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
  ) {
    errors.push("Practice settings fields are invalid.");
  }
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

function validateGuidedPracticeSettings(
  value: unknown,
): PersistenceValidationResult {
  const errors: string[] = [];
  if (!isRecord(value)) {
    return {
      errors: ["Guided practice settings must be an object."],
      success: false,
    };
  }
  if (
    !hasExactKeys(value, [
      "mode",
      "tempoTrainer",
      "chordTrainer",
      "strummingPattern",
    ])
  ) {
    errors.push("Guided practice settings fields are invalid.");
  }
  if (!isPracticeMode(value.mode))
    errors.push("Guided practice settings mode is invalid.");
  if (!validateTempoTrainerConfiguration(value.tempoTrainer).success)
    errors.push("Guided practice tempo trainer settings are invalid.");
  if (!validateChordTrainerConfiguration(value.chordTrainer).success)
    errors.push("Guided practice chord trainer settings are invalid.");
  if (!validateStrummingPattern(value.strummingPattern).success)
    errors.push("Guided practice strumming settings are invalid.");
  return { errors, success: errors.length === 0 };
}

function validateBackupPreferences(
  value: unknown,
  version: 3 | 4,
): PersistenceValidationResult {
  const errors: string[] = [];
  if (!isRecord(value)) {
    return {
      errors: ["Backup preferences must be an object."],
      success: false,
    };
  }
  if (
    !hasExactKeys(value, [
      "appearance",
      "onboardingDismissed",
      "recentPatternIds",
    ])
  ) {
    errors.push("Backup preference fields are invalid.");
  }
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
  if (typeof value.onboardingDismissed !== "boolean") {
    errors.push("Backup onboarding preference is invalid.");
  }
  if (
    !Array.isArray(value.recentPatternIds) ||
    value.recentPatternIds.length > MAX_RECENT_PATTERNS ||
    !hasUniqueStrings(value.recentPatternIds)
  ) {
    errors.push("Backup recent pattern preferences are invalid.");
  }
  return { errors, success: errors.length === 0 };
}

function validateFavoriteIds(
  value: unknown,
  name: string,
  errors: string[],
): value is string[] {
  if (!Array.isArray(value)) {
    errors.push(`${name} must be an array.`);
    return false;
  }
  if (value.length > MAX_BACKUP_COLLECTION_RECORDS) {
    errors.push(
      `${name} cannot contain more than ${MAX_BACKUP_COLLECTION_RECORDS} records.`,
    );
    return false;
  }
  if (!hasUniqueStrings(value)) {
    errors.push(`${name} must contain valid, unique IDs.`);
    return false;
  }
  return true;
}

export function validateBackupEnvelope(
  value: unknown,
): PersistenceValidationResult {
  const errors: string[] = [];
  if (!isRecord(value)) {
    return { errors: ["Backup must be an object."], success: false };
  }
  if (!hasExactKeys(value, ["app", "version", "exportedAt", "data"]))
    errors.push("Backup envelope fields are invalid.");
  if (value.app !== "web-band") errors.push("Backup app ID is unsupported.");
  if (
    value.version !== 1 &&
    value.version !== 2 &&
    value.version !== 3 &&
    value.version !== 4
  )
    errors.push("Backup version is unsupported.");
  if (!isCanonicalUtcIsoTimestamp(value.exportedAt))
    errors.push("Backup export date is invalid.");
  if (!isRecord(value.data)) {
    errors.push("Backup data must be an object.");
    return { errors, success: false };
  }

  const data = value.data;
  const version =
    value.version === 1
      ? 1
      : value.version === 2
        ? 2
        : value.version === 3
          ? 3
          : (4 as const);
  if (
    !hasExactKeys(data, [
      "customPatterns",
      "favoritePatternIds",
      "customChordProgressions",
      "favoriteChordProgressionIds",
      "customStrummingPatterns",
      "practicePresets",
      "practiceSessions",
      ...(version >= 3 ? ["preferences"] : []),
      "settings",
    ])
  ) {
    errors.push("Backup data fields are invalid.");
  }

  validateCollection(
    data.customPatterns,
    "Custom patterns",
    validateCustomDrumPattern,
    errors,
  );
  validateFavoriteIds(data.favoritePatternIds, "Favorite pattern IDs", errors);
  validateCollection(
    data.customChordProgressions,
    "Custom chord progressions",
    validateCustomChordProgression,
    errors,
  );
  validateFavoriteIds(
    data.favoriteChordProgressionIds,
    "Favorite chord progression IDs",
    errors,
  );
  validateCollection(
    data.customStrummingPatterns,
    "Custom strumming patterns",
    validateCustomStrummingPattern,
    errors,
  );
  validateCollection(
    data.practicePresets,
    "Practice presets",
    validatePracticePreset,
    errors,
  );
  validateCollection(
    data.practiceSessions,
    "Practice sessions",
    validatePracticeSession,
    errors,
  );

  const collections = [
    data.customPatterns,
    data.favoritePatternIds,
    data.customChordProgressions,
    data.favoriteChordProgressionIds,
    data.customStrummingPatterns,
    data.practicePresets,
    data.practiceSessions,
  ];
  if (
    collections.every(Array.isArray) &&
    collections.reduce((total, collection) => total + collection.length, 0) >
      MAX_BACKUP_TOTAL_RECORDS
  ) {
    errors.push(
      `Backup cannot contain more than ${MAX_BACKUP_TOTAL_RECORDS} total records.`,
    );
  }

  if (!isRecord(data.settings)) {
    errors.push("Backup settings must be an object.");
  } else {
    if (!hasExactKeys(data.settings, ["practice", "guidedPractice", "history"]))
      errors.push("Backup settings fields are invalid.");
    if (!validatePracticeSettings(data.settings.practice, version).success)
      errors.push("Backup practice settings are invalid.");
    if (!validateGuidedPracticeSettings(data.settings.guidedPractice).success)
      errors.push("Backup guided practice settings are invalid.");
    if (
      !validateHistorySettings(
        data.settings.history,
        version < 3 ? 0 : MIN_HISTORY_MINIMUM_DURATION_SECONDS,
      ).success
    )
      errors.push("Backup history settings are invalid.");
  }
  if (
    version >= 3 &&
    !validateBackupPreferences(data.preferences, version === 3 ? 3 : 4).success
  ) {
    errors.push("Backup preferences are invalid.");
  }

  const availablePatternIds = new Set(builtInPatternIds);
  if (Array.isArray(data.customPatterns)) {
    for (const pattern of data.customPatterns) {
      if (validateCustomDrumPattern(pattern).success && isRecord(pattern)) {
        availablePatternIds.add(pattern.id as string);
      }
    }
  }
  if (Array.isArray(data.favoritePatternIds)) {
    for (const patternId of data.favoritePatternIds) {
      if (
        typeof patternId === "string" &&
        !availablePatternIds.has(patternId)
      ) {
        errors.push(
          `Favorite pattern ID ${patternId} is not included in this backup.`,
        );
      }
    }
  }
  if (
    version >= 3 &&
    isRecord(data.preferences) &&
    Array.isArray(data.preferences.recentPatternIds)
  ) {
    for (const patternId of data.preferences.recentPatternIds) {
      if (
        typeof patternId === "string" &&
        !availablePatternIds.has(patternId)
      ) {
        errors.push(
          `Recent pattern ID ${patternId} is not included in this backup.`,
        );
      }
    }
  }
  if (
    isRecord(data.settings) &&
    isRecord(data.settings.practice) &&
    typeof data.settings.practice.selectedPatternId === "string" &&
    !availablePatternIds.has(data.settings.practice.selectedPatternId)
  ) {
    errors.push(
      `Practice settings pattern ID ${data.settings.practice.selectedPatternId} is not included in this backup.`,
    );
  }
  const availableChordProgressionIds = new Set(builtInChordProgressionIds);
  if (Array.isArray(data.customChordProgressions)) {
    for (const progression of data.customChordProgressions) {
      if (
        validateCustomChordProgression(progression).success &&
        isRecord(progression)
      ) {
        availableChordProgressionIds.add(progression.id as string);
      }
    }
  }
  if (Array.isArray(data.favoriteChordProgressionIds)) {
    for (const progressionId of data.favoriteChordProgressionIds) {
      if (
        typeof progressionId === "string" &&
        !availableChordProgressionIds.has(progressionId)
      ) {
        errors.push(
          `Favorite chord progression ID ${progressionId} is not included in this backup.`,
        );
      }
    }
  }

  const availableStrummingPatternIds = new Set(builtInStrummingPatternIds);
  if (Array.isArray(data.customStrummingPatterns)) {
    for (const pattern of data.customStrummingPatterns) {
      if (
        validateCustomStrummingPattern(pattern).success &&
        isRecord(pattern)
      ) {
        availableStrummingPatternIds.add(pattern.id as string);
      }
    }
  }
  if (
    isRecord(data.settings) &&
    isRecord(data.settings.guidedPractice) &&
    isRecord(data.settings.guidedPractice.strummingPattern) &&
    typeof data.settings.guidedPractice.strummingPattern.id === "string" &&
    !availableStrummingPatternIds.has(
      data.settings.guidedPractice.strummingPattern.id,
    )
  ) {
    errors.push(
      `Guided practice strumming pattern ID ${data.settings.guidedPractice.strummingPattern.id} is not included in this backup.`,
    );
  }
  return { errors, success: errors.length === 0 };
}

export function isCustomDrumPattern(
  value: unknown,
): value is CustomDrumPattern {
  return validateCustomDrumPattern(value).success;
}

export function isCustomStrummingPattern(
  value: unknown,
): value is CustomStrummingPattern {
  return validateCustomStrummingPattern(value).success;
}

export function isPracticeSession(value: unknown): value is PracticeSession {
  return validatePracticeSession(value).success;
}

export function isHistorySettings(value: unknown): value is HistorySettings {
  return validateHistorySettings(value).success;
}

export function isBackupEnvelope(
  value: unknown,
): value is VersionedBackupEnvelope {
  return validateBackupEnvelope(value).success;
}
