import { getPatternStepCount } from "@/lib/musical-time";
import type {
  DrumHit,
  DrumInstrument,
  DrumPattern,
  PatternCategory,
  PatternDifficulty,
} from "@/types/pattern";

const instruments = new Set<DrumInstrument>([
  "kick",
  "snare",
  "closedHat",
  "openHat",
  "lowTom",
  "midTom",
  "highTom",
  "crash",
  "ride",
  "rim",
  "clap",
]);

const categories = new Set<PatternCategory>([
  "rock",
  "pop",
  "blues",
  "funk",
  "reggae",
  "country",
  "ballad",
  "latin",
  "metal",
  "jazz",
  "custom",
]);

const difficulties = new Set<PatternDifficulty>([
  "beginner",
  "intermediate",
  "advanced",
]);

export interface PatternValidationResult {
  success: boolean;
  errors: string[];
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function isNumberInRange(
  value: unknown,
  min: number,
  max: number,
): value is number {
  return (
    typeof value === "number" &&
    Number.isFinite(value) &&
    value >= min &&
    value <= max
  );
}

function isValidHit(value: unknown, stepCount: number): value is DrumHit {
  if (!isRecord(value)) {
    return false;
  }

  return (
    typeof value.id === "string" &&
    instruments.has(value.instrument as DrumInstrument) &&
    Number.isInteger(value.step) &&
    isNumberInRange(value.step, 0, stepCount - 1) &&
    isNumberInRange(value.velocity, 0, 1) &&
    (value.probability === undefined ||
      isNumberInRange(value.probability, 0, 1)) &&
    (value.flam === undefined || typeof value.flam === "boolean") &&
    (value.timingOffset === undefined ||
      isNumberInRange(value.timingOffset, -0.1, 0.1))
  );
}

export function validatePattern(value: unknown): PatternValidationResult {
  const errors: string[] = [];

  if (!isRecord(value)) {
    return { success: false, errors: ["Pattern must be an object."] };
  }

  if (typeof value.id !== "string" || value.id.trim() === "")
    errors.push("Pattern ID is required.");
  if (typeof value.name !== "string" || value.name.trim() === "")
    errors.push("Pattern name is required.");
  if (typeof value.description !== "string")
    errors.push("Pattern description must be text.");
  if (!categories.has(value.category as PatternCategory))
    errors.push("Pattern category is invalid.");
  if (!difficulties.has(value.difficulty as PatternDifficulty))
    errors.push("Pattern difficulty is invalid.");
  if (value.subdivision !== 8 && value.subdivision !== 16)
    errors.push("Subdivision must be 8 or 16.");
  if (!Number.isInteger(value.bars) || !isNumberInRange(value.bars, 1, 4))
    errors.push("Pattern bars must be between 1 and 4.");
  if (!isNumberInRange(value.defaultBpm, 40, 220))
    errors.push("Default BPM must be between 40 and 220.");
  if (typeof value.isBuiltIn !== "boolean")
    errors.push("Built-in status is required.");

  if (!isRecord(value.timeSignature)) {
    errors.push("Time signature is required.");
  } else if (
    !Number.isInteger(value.timeSignature.numerator) ||
    !isNumberInRange(value.timeSignature.numerator, 1, 12) ||
    ![4, 8].includes(value.timeSignature.denominator as number)
  ) {
    errors.push("Time signature is invalid.");
  }

  if (
    !isRecord(value.recommendedBpmRange) ||
    !isNumberInRange(value.recommendedBpmRange.min, 40, 220) ||
    !isNumberInRange(value.recommendedBpmRange.max, 40, 220) ||
    value.recommendedBpmRange.min > value.recommendedBpmRange.max
  ) {
    errors.push("Recommended BPM range is invalid.");
  }

  if (!Array.isArray(value.hits)) {
    errors.push("Pattern hits must be an array.");
  } else if (
    errors.length === 0 &&
    !value.hits.every((hit) =>
      isValidHit(hit, getPatternStepCount(value as unknown as DrumPattern)),
    )
  ) {
    errors.push("One or more drum hits are invalid.");
  }

  return { success: errors.length === 0, errors };
}

export function isDrumPattern(value: unknown): value is DrumPattern {
  return validatePattern(value).success;
}
