import { isCanonicalUtcIsoTimestamp } from "@/lib/timestamp-validation";

export interface PersistenceValidationResult {
  success: boolean;
  errors: string[];
}

export const MAX_BACKUP_COLLECTION_RECORDS = 10_000;
export const MAX_BACKUP_TOTAL_RECORDS = 25_000;
export const MAX_ID_LENGTH = 128;
export const MAX_NAME_LENGTH = 100;

export function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

export function hasBoundedText(
  value: unknown,
  maximumLength: number,
): value is string {
  return (
    typeof value === "string" &&
    value.trim() !== "" &&
    value.length <= maximumLength
  );
}

export function hasOnlyKeys(
  value: Record<string, unknown>,
  allowedKeys: readonly string[],
): boolean {
  const allowed = new Set(allowedKeys);
  return Object.keys(value).every((key) => allowed.has(key));
}

export function hasExactKeys(
  value: Record<string, unknown>,
  expectedKeys: readonly string[],
): boolean {
  return (
    Object.keys(value).length === expectedKeys.length &&
    expectedKeys.every((key) => Object.hasOwn(value, key))
  );
}

export function isIntegerInRange(
  value: unknown,
  minimum: number,
  maximum: number,
) {
  return (
    typeof value === "number" &&
    Number.isInteger(value) &&
    value >= minimum &&
    value <= maximum
  );
}

export function isNumberInRange(
  value: unknown,
  minimum: number,
  maximum: number,
) {
  return (
    typeof value === "number" &&
    Number.isFinite(value) &&
    value >= minimum &&
    value <= maximum
  );
}

export function timestampsAreOrdered(
  createdAt: unknown,
  updatedAt: unknown,
): boolean {
  return (
    isCanonicalUtcIsoTimestamp(createdAt) &&
    isCanonicalUtcIsoTimestamp(updatedAt) &&
    Date.parse(updatedAt) >= Date.parse(createdAt)
  );
}

export function hasUniqueStrings(values: readonly unknown[]): boolean {
  return (
    values.every((value) => hasBoundedText(value, MAX_ID_LENGTH)) &&
    new Set(values).size === values.length
  );
}

export function hasUniqueIds(values: readonly unknown[]): boolean {
  const ids: string[] = [];
  for (const value of values) {
    if (!isRecord(value) || !hasBoundedText(value.id, MAX_ID_LENGTH))
      return false;
    ids.push(value.id);
  }
  return new Set(ids).size === values.length;
}
