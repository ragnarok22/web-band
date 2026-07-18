export function isCanonicalUtcIsoTimestamp(value: unknown): value is string {
  if (typeof value !== "string") {
    return false;
  }

  try {
    return new Date(value).toISOString() === value;
  } catch {
    return false;
  }
}
