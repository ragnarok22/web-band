import { builtInChordProgressions } from "@/data/chord-progressions";
import { builtInPatterns } from "@/data/patterns";
import { builtInStrummingPatterns } from "@/data/strumming-patterns";
import { MIN_HISTORY_MINIMUM_DURATION_SECONDS } from "@/lib/history-settings";
import {
  validateCustomChordProgression,
  validatePracticePreset,
} from "@/lib/practice-validation";
import { isCanonicalUtcIsoTimestamp } from "@/lib/timestamp-validation";
import type { VersionedBackupEnvelope } from "@/types/persistence";
import { validateHistorySettings, validatePracticeSession } from "./history";
import {
  validateCustomDrumPattern,
  validateCustomStrummingPattern,
} from "./patterns";
import {
  validateBackupPreferences,
  validateGuidedPracticeSettings,
  validatePracticeSettings,
} from "./settings";
import {
  hasExactKeys,
  hasUniqueIds,
  hasUniqueStrings,
  isRecord,
  MAX_BACKUP_COLLECTION_RECORDS,
  MAX_BACKUP_TOTAL_RECORDS,
  type PersistenceValidationResult,
} from "./shared";

const builtInPatternIds = new Set(builtInPatterns.map(({ id }) => id));
const builtInChordProgressionIds = new Set(
  builtInChordProgressions.map(({ id }) => id),
);
const builtInStrummingPatternIds = new Set(
  builtInStrummingPatterns.map(({ id }) => id),
);

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
  if (!isRecord(value))
    return { errors: ["Backup must be an object."], success: false };
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
  )
    errors.push("Backup data fields are invalid.");
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
  )
    errors.push("Backup preferences are invalid.");

  const availablePatternIds = new Set(builtInPatternIds);
  if (Array.isArray(data.customPatterns)) {
    for (const pattern of data.customPatterns) {
      if (validateCustomDrumPattern(pattern).success && isRecord(pattern))
        availablePatternIds.add(pattern.id as string);
    }
  }
  if (Array.isArray(data.favoritePatternIds)) {
    for (const patternId of data.favoritePatternIds) {
      if (typeof patternId === "string" && !availablePatternIds.has(patternId))
        errors.push(
          `Favorite pattern ID ${patternId} is not included in this backup.`,
        );
    }
  }
  if (
    version >= 3 &&
    isRecord(data.preferences) &&
    Array.isArray(data.preferences.recentPatternIds)
  ) {
    for (const patternId of data.preferences.recentPatternIds) {
      if (typeof patternId === "string" && !availablePatternIds.has(patternId))
        errors.push(
          `Recent pattern ID ${patternId} is not included in this backup.`,
        );
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
      )
        availableChordProgressionIds.add(progression.id as string);
    }
  }
  if (Array.isArray(data.favoriteChordProgressionIds)) {
    for (const progressionId of data.favoriteChordProgressionIds) {
      if (
        typeof progressionId === "string" &&
        !availableChordProgressionIds.has(progressionId)
      )
        errors.push(
          `Favorite chord progression ID ${progressionId} is not included in this backup.`,
        );
    }
  }
  const availableStrummingPatternIds = new Set(builtInStrummingPatternIds);
  if (Array.isArray(data.customStrummingPatterns)) {
    for (const pattern of data.customStrummingPatterns) {
      if (validateCustomStrummingPattern(pattern).success && isRecord(pattern))
        availableStrummingPatternIds.add(pattern.id as string);
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

export function isBackupEnvelope(
  value: unknown,
): value is VersionedBackupEnvelope {
  return validateBackupEnvelope(value).success;
}
