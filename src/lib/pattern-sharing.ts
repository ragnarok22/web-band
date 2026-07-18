import {
  isCanonicalUtcIsoTimestamp,
  validateCustomDrumPattern,
} from "@/lib/persistence-validation";
import type { CustomDrumPattern } from "@/types/persistence";
import type {
  PatternShareEnvelope,
  PatternSharePreview,
} from "@/types/pattern-sharing";

export const MAX_PATTERN_SHARE_FILE_BYTES = 10 * 1024 * 1024;
export const MAX_SHARED_PATTERNS = 100;

export class PatternShareFileError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "PatternShareFileError";
  }
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function hasExactKeys(
  value: Record<string, unknown>,
  keys: readonly string[],
): boolean {
  return (
    Object.keys(value).length === keys.length &&
    keys.every((key) => Object.hasOwn(value, key))
  );
}

export function validatePatternShareEnvelope(value: unknown): string[] {
  if (!isRecord(value)) return ["Pattern file must be an object."];

  const errors: string[] = [];
  if (!hasExactKeys(value, ["app", "kind", "version", "exportedAt", "data"]))
    errors.push("Pattern file fields are invalid.");
  if (value.app !== "web-band") errors.push("Pattern file app is unsupported.");
  if (value.kind !== "drum-patterns")
    errors.push("Pattern file type is unsupported.");
  if (value.version !== 1) errors.push("Pattern file version is unsupported.");
  if (!isCanonicalUtcIsoTimestamp(value.exportedAt))
    errors.push("Pattern file export date is invalid.");

  if (!isRecord(value.data) || !hasExactKeys(value.data, ["patterns"])) {
    errors.push("Pattern file data is invalid.");
    return errors;
  }
  const patterns = value.data.patterns;
  if (!Array.isArray(patterns)) {
    errors.push("Shared patterns must be an array.");
    return errors;
  }
  if (patterns.length === 0)
    errors.push("Pattern file must contain at least one pattern.");
  if (patterns.length > MAX_SHARED_PATTERNS)
    errors.push(
      `Pattern file cannot contain more than ${MAX_SHARED_PATTERNS} patterns.`,
    );

  const ids = new Set<string>();
  for (const pattern of patterns) {
    const validation = validateCustomDrumPattern(pattern);
    if (!validation.success) {
      errors.push(
        `Pattern file contains an invalid pattern. ${validation.errors[0] ?? "Pattern data is incomplete."}`,
      );
      continue;
    }
    const id = (pattern as CustomDrumPattern).id;
    if (ids.has(id)) errors.push("Shared pattern IDs must be unique.");
    ids.add(id);
  }
  return errors;
}

export function createPatternShareEnvelope(
  patterns: readonly CustomDrumPattern[],
  exportedAt = new Date(),
): PatternShareEnvelope {
  const envelope: PatternShareEnvelope = {
    app: "web-band",
    data: { patterns: structuredClone([...patterns]) },
    exportedAt: exportedAt.toISOString(),
    kind: "drum-patterns",
    version: 1,
  };
  const errors = validatePatternShareEnvelope(envelope);
  if (errors.length > 0) throw new PatternShareFileError(errors.join(" "));
  return envelope;
}

export function serializePatternShareEnvelope(
  envelope: PatternShareEnvelope,
): string {
  return `${JSON.stringify(envelope, null, 2)}\n`;
}

export function parsePatternShareText(
  text: string,
  fileName: string | null = null,
): PatternSharePreview {
  const byteSize = new TextEncoder().encode(text).byteLength;
  if (byteSize > MAX_PATTERN_SHARE_FILE_BYTES) {
    throw new PatternShareFileError(
      "Pattern file is larger than the 10 MB limit.",
    );
  }

  let value: unknown;
  try {
    value = JSON.parse(text) as unknown;
  } catch {
    throw new PatternShareFileError("This pattern file is not valid JSON.");
  }
  const errors = validatePatternShareEnvelope(value);
  if (errors.length > 0) {
    throw new PatternShareFileError(
      `This is not a valid Web Band pattern file. ${errors[0]}`,
    );
  }
  const envelope = structuredClone(value as PatternShareEnvelope);
  return {
    byteSize,
    envelope,
    fileName,
    patternCount: envelope.data.patterns.length,
  };
}

function safeFileSegment(value: string): string {
  const segment = value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 60);
  return segment || "custom-groove";
}

export function patternShareFileName(envelope: PatternShareEnvelope): string {
  const patterns = envelope.data.patterns;
  return patterns.length === 1
    ? `web-band-pattern-${safeFileSegment(patterns[0]!.name)}.json`
    : `web-band-patterns-${envelope.exportedAt.slice(0, 10)}.json`;
}
