import { builtInPatterns } from "@/data/patterns";
import { builtInStrummingPatterns } from "@/data/strumming-patterns";
import { validatePattern } from "@/lib/pattern-validation";
import { validateStrummingPattern } from "@/lib/practice-validation";
import { isCanonicalUtcIsoTimestamp } from "@/lib/timestamp-validation";
import type {
  CustomDrumPattern,
  CustomStrummingPattern,
} from "@/types/persistence";
import {
  hasBoundedText,
  hasOnlyKeys,
  hasUniqueStrings,
  isNumberInRange,
  isRecord,
  MAX_ID_LENGTH,
  MAX_NAME_LENGTH,
  timestampsAreOrdered,
  type PersistenceValidationResult,
} from "./shared";

const MAX_DESCRIPTION_LENGTH = 1_000;
const MAX_PATTERN_HITS = 2_048;
const builtInPatternIds = new Set(builtInPatterns.map(({ id }) => id));
const builtInStrummingPatternIds = new Set(
  builtInStrummingPatterns.map(({ id }) => id),
);

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

  if (!isRecord(value)) return { errors, success: false };
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
  )
    errors.push("Custom drum pattern contains unsupported fields.");
  if (!hasBoundedText(value.id, MAX_ID_LENGTH))
    errors.push("Custom drum pattern ID is invalid.");
  if (typeof value.id === "string" && builtInPatternIds.has(value.id))
    errors.push("Custom drum pattern ID conflicts with a built-in pattern.");
  if (!hasBoundedText(value.name, MAX_NAME_LENGTH))
    errors.push("Custom drum pattern name is invalid.");
  if (
    typeof value.description !== "string" ||
    value.description.length > MAX_DESCRIPTION_LENGTH
  )
    errors.push("Custom drum pattern description is too long.");
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
  if (value.swing !== undefined && !isNumberInRange(value.swing, 0, 0.65))
    errors.push("Custom drum pattern swing is invalid.");
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
      if (new Set(cells).size !== cells.length)
        errors.push(
          "Custom drum pattern hits must use unique instrument cells.",
        );
    }
  }
  return { errors, success: errors.length === 0 };
}

export function validateCustomStrummingPattern(
  value: unknown,
): PersistenceValidationResult {
  const baseResult = validateStrummingPattern(value);
  const errors = [...baseResult.errors];
  if (!isRecord(value)) return { errors, success: false };
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
