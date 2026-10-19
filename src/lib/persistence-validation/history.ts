import {
  MAX_HISTORY_MINIMUM_DURATION_SECONDS,
  MIN_HISTORY_MINIMUM_DURATION_SECONDS,
} from "@/lib/history-settings";
import { MAX_BPM, MIN_BPM } from "@/lib/musical-time";
import { isPracticeMode } from "@/lib/practice-validation";
import { isCanonicalUtcIsoTimestamp } from "@/lib/timestamp-validation";
import type { HistorySettings, PracticeSession } from "@/types/persistence";
import {
  hasBoundedText,
  hasExactKeys,
  isIntegerInRange,
  isRecord,
  MAX_ID_LENGTH,
  MAX_NAME_LENGTH,
  timestampsAreOrdered,
  type PersistenceValidationResult,
} from "./shared";

const MAX_CATEGORY_LENGTH = 64;
const MAX_TIME_SIGNATURE_LENGTH = 16;
const MAX_SESSION_DURATION_SECONDS = 86_400;

export function validatePracticeSession(
  value: unknown,
): PersistenceValidationResult {
  const errors: string[] = [];
  if (!isRecord(value))
    return { errors: ["Practice session must be an object."], success: false };
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
  if (!isIntegerInRange(value.durationSeconds, 1, MAX_SESSION_DURATION_SECONDS))
    errors.push("Practice session duration is invalid.");
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
  )
    errors.push("Practice session time signature is invalid.");
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
  if (!isRecord(value))
    return { errors: ["History settings must be an object."], success: false };
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
  )
    errors.push("History minimum duration is invalid.");
  return { errors, success: errors.length === 0 };
}

export function isPracticeSession(value: unknown): value is PracticeSession {
  return validatePracticeSession(value).success;
}

export function isHistorySettings(value: unknown): value is HistorySettings {
  return validateHistorySettings(value).success;
}
