import { builtInChordProgressions } from "@/data/chord-progressions";
import { MAX_BPM, MIN_BPM } from "@/lib/musical-time";
import { isCanonicalUtcIsoTimestamp } from "@/lib/timestamp-validation";
import type {
  CustomChordProgression,
  PracticePreset,
  PracticePresetConfiguration,
} from "@/types/persistence";
import type {
  ChordTrainerConfiguration,
  GuidedPracticeConfiguration,
  PracticeMode,
  StrumAction,
  StrummingPattern,
  TempoTrainerConfiguration,
} from "@/types/practice";

export interface PracticeValidationResult {
  success: boolean;
  errors: string[];
}

const practiceModes = new Set<PracticeMode>([
  "drums",
  "tempoTrainer",
  "chords",
  "strumming",
]);

const strumActions = new Set<StrumAction>([
  "down",
  "up",
  "mute",
  "rest",
  "hold",
]);

const MAX_ID_LENGTH = 128;
const MAX_NAME_LENGTH = 100;
const MAX_CHORD_LENGTH = 32;
const MAX_CHORD_STEPS = 64;
const MAX_CHORD_DURATION = 64;
const MAX_STRUM_STEPS = 48;
const builtInChordProgressionIds = new Set(
  builtInChordProgressions.map(({ id }) => id),
);

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function hasText(value: unknown): value is string {
  return typeof value === "string" && value.trim() !== "";
}

function hasBoundedText(
  value: unknown,
  maximumLength: number,
): value is string {
  return hasText(value) && value.length <= maximumLength;
}

function isPositiveInteger(value: unknown): value is number {
  return Number.isInteger(value) && typeof value === "number" && value > 0;
}

function isBpm(value: unknown): value is number {
  return (
    typeof value === "number" &&
    Number.isInteger(value) &&
    value >= MIN_BPM &&
    value <= MAX_BPM
  );
}

function isOptionalCanonicalTimestamp(value: unknown): boolean {
  return value === undefined || isCanonicalUtcIsoTimestamp(value);
}

function isUnit(value: unknown): value is number {
  return (
    typeof value === "number" &&
    Number.isFinite(value) &&
    value >= 0 &&
    value <= 1
  );
}

function isSwing(value: unknown): value is number {
  return (
    typeof value === "number" &&
    Number.isFinite(value) &&
    value >= 0 &&
    value <= 0.65
  );
}

function isCountInMeasures(value: unknown): boolean {
  return value === 0 || value === 1 || value === 2 || value === 4;
}

function isFillFrequency(value: unknown): boolean {
  return (
    value === null ||
    value === 4 ||
    value === 8 ||
    value === 16 ||
    value === "random"
  );
}

function isValidTimeSignature(value: unknown): boolean {
  return (
    isRecord(value) &&
    isPositiveInteger(value.numerator) &&
    value.numerator <= 12 &&
    (value.denominator === 4 || value.denominator === 8)
  );
}

export function isPracticeMode(value: unknown): value is PracticeMode {
  return practiceModes.has(value as PracticeMode);
}

export function isStrumAction(value: unknown): value is StrumAction {
  return strumActions.has(value as StrumAction);
}

export function validateTempoTrainerInterval(
  value: unknown,
): PracticeValidationResult {
  if (!isRecord(value)) {
    return {
      errors: ["Tempo trainer interval must be an object."],
      success: false,
    };
  }

  const valid =
    (value.type === "measures" && isPositiveInteger(value.measures)) ||
    (value.type === "seconds" && isPositiveInteger(value.seconds));

  return {
    errors: valid ? [] : ["Tempo trainer interval is invalid."],
    success: valid,
  };
}

export function validateTempoTrainerConfiguration(
  value: unknown,
): PracticeValidationResult {
  const errors: string[] = [];

  if (!isRecord(value)) {
    return {
      errors: ["Tempo trainer configuration must be an object."],
      success: false,
    };
  }

  if (!isBpm(value.startBpm)) errors.push("Starting BPM is invalid.");
  if (!isBpm(value.endBpm)) errors.push("Ending BPM is invalid.");
  if (!isPositiveInteger(value.increment))
    errors.push("Tempo increment must be a positive integer.");
  if (!validateTempoTrainerInterval(value.interval).success)
    errors.push("Tempo trainer interval is invalid.");
  if (typeof value.stopAtTarget !== "boolean")
    errors.push("Stop-at-target setting is required.");
  if (typeof value.resetToStartingBpmOnStop !== "boolean")
    errors.push("Reset-on-stop setting is required.");

  return { errors, success: errors.length === 0 };
}

export function validateChordStep(value: unknown): PracticeValidationResult {
  const errors: string[] = [];

  if (!isRecord(value)) {
    return { errors: ["Chord step must be an object."], success: false };
  }

  if (!hasBoundedText(value.id, MAX_ID_LENGTH))
    errors.push(
      "Chord step ID is required and must be 128 characters or fewer.",
    );
  if (!hasBoundedText(value.chord, MAX_CHORD_LENGTH))
    errors.push("Chord name is required and must be 32 characters or fewer.");
  if (!isPositiveInteger(value.duration) || value.duration > MAX_CHORD_DURATION)
    errors.push("Chord duration must be a positive integer.");
  if (value.durationUnit !== "beats" && value.durationUnit !== "measures")
    errors.push("Chord duration unit is invalid.");

  return { errors, success: errors.length === 0 };
}

export function validateChordProgression(
  value: unknown,
): PracticeValidationResult {
  const errors: string[] = [];

  if (!isRecord(value)) {
    return { errors: ["Chord progression must be an object."], success: false };
  }

  if (!hasBoundedText(value.id, MAX_ID_LENGTH))
    errors.push(
      "Chord progression ID is required and must be 128 characters or fewer.",
    );
  if (!hasBoundedText(value.name, MAX_NAME_LENGTH))
    errors.push(
      "Chord progression name is required and must be 100 characters or fewer.",
    );
  if (typeof value.isBuiltIn !== "boolean")
    errors.push("Chord progression built-in status is required.");
  if (!isOptionalCanonicalTimestamp(value.createdAt))
    errors.push("Chord progression creation date is invalid.");
  if (!isOptionalCanonicalTimestamp(value.updatedAt))
    errors.push("Chord progression update date is invalid.");

  if (!Array.isArray(value.steps) || value.steps.length === 0) {
    errors.push("Chord progression must contain at least one step.");
  } else if (value.steps.length > MAX_CHORD_STEPS) {
    errors.push("Chord progression cannot contain more than 64 steps.");
  } else {
    const ids = new Set<string>();
    for (const step of value.steps) {
      const result = validateChordStep(step);
      if (!result.success) errors.push(...result.errors);
      if (isRecord(step) && hasText(step.id)) ids.add(step.id);
    }
    if (ids.size !== value.steps.length)
      errors.push("Chord step IDs must be unique.");
  }

  return { errors, success: errors.length === 0 };
}

export function validateChordTrainerConfiguration(
  value: unknown,
): PracticeValidationResult {
  const errors: string[] = [];

  if (!isRecord(value)) {
    return {
      errors: ["Chord trainer configuration must be an object."],
      success: false,
    };
  }

  if (!validateChordProgression(value.progression).success)
    errors.push("Chord progression is invalid.");
  if (typeof value.repeat !== "boolean")
    errors.push("Chord repeat setting is required.");
  if (typeof value.showCountdown !== "boolean")
    errors.push("Chord countdown setting is required.");

  return { errors, success: errors.length === 0 };
}

export function validateStrumStep(value: unknown): PracticeValidationResult {
  const errors: string[] = [];

  if (!isRecord(value)) {
    return { errors: ["Strum step must be an object."], success: false };
  }

  if (!hasBoundedText(value.id, MAX_ID_LENGTH))
    errors.push("Strum step ID is invalid.");
  if (
    !Number.isInteger(value.subdivisionIndex) ||
    typeof value.subdivisionIndex !== "number" ||
    value.subdivisionIndex < 0
  ) {
    errors.push("Strum subdivision index is invalid.");
  }
  if (!isStrumAction(value.action)) errors.push("Strum action is invalid.");
  if (value.accent !== undefined && typeof value.accent !== "boolean")
    errors.push("Strum accent must be a boolean.");

  return { errors, success: errors.length === 0 };
}

export function validateStrummingPattern(
  value: unknown,
): PracticeValidationResult {
  const errors: string[] = [];

  if (!isRecord(value)) {
    return { errors: ["Strumming pattern must be an object."], success: false };
  }

  if (!hasBoundedText(value.id, MAX_ID_LENGTH))
    errors.push("Strumming pattern ID is invalid.");
  if (!hasBoundedText(value.name, MAX_NAME_LENGTH))
    errors.push("Strumming pattern name is invalid.");
  if (!isValidTimeSignature(value.timeSignature))
    errors.push("Strumming pattern time signature is invalid.");
  if (value.subdivision !== 8 && value.subdivision !== 16)
    errors.push("Strumming pattern subdivision must be 8 or 16.");
  if (typeof value.isBuiltIn !== "boolean")
    errors.push("Strumming pattern built-in status is required.");

  if (!Array.isArray(value.steps)) {
    errors.push("Strumming pattern steps must be an array.");
  } else if (value.steps.length > MAX_STRUM_STEPS) {
    errors.push("Strumming pattern cannot contain more than 48 steps.");
  } else if (
    isRecord(value.timeSignature) &&
    isPositiveInteger(value.timeSignature.numerator) &&
    (value.timeSignature.denominator === 4 ||
      value.timeSignature.denominator === 8) &&
    (value.subdivision === 8 || value.subdivision === 16)
  ) {
    const expectedStepCount =
      value.timeSignature.numerator *
      (value.subdivision / value.timeSignature.denominator);
    if (
      !Number.isInteger(expectedStepCount) ||
      value.steps.length !== expectedStepCount
    )
      errors.push("Strumming pattern must define every subdivision.");

    const ids = new Set<string>();
    value.steps.forEach((step, index) => {
      const result = validateStrumStep(step);
      if (!result.success) errors.push(...result.errors);
      if (isRecord(step) && step.subdivisionIndex !== index)
        errors.push("Strum steps must be in subdivision order.");
      if (isRecord(step) && hasText(step.id)) ids.add(step.id);
    });
    if (ids.size !== value.steps.length)
      errors.push("Strum step IDs must be unique.");
  }

  return { errors, success: errors.length === 0 };
}

export function validateGuidedPracticeConfiguration(
  value: unknown,
): PracticeValidationResult {
  if (!isRecord(value) || !isPracticeMode(value.mode)) {
    return {
      errors: ["Guided practice mode is invalid."],
      success: false,
    };
  }

  let nestedResult: PracticeValidationResult;
  switch (value.mode) {
    case "drums":
      return { errors: [], success: true };
    case "tempoTrainer":
      nestedResult = validateTempoTrainerConfiguration(value.tempoTrainer);
      break;
    case "chords":
      nestedResult = validateChordTrainerConfiguration(value.chordTrainer);
      break;
    case "strumming":
      nestedResult = validateStrummingPattern(value.strummingPattern);
      break;
  }

  return nestedResult.success
    ? { errors: [], success: true }
    : {
        errors: [`${value.mode} guided practice configuration is invalid.`],
        success: false,
      };
}

export function validateCustomChordProgression(
  value: unknown,
): PracticeValidationResult {
  const result = validateChordProgression(value);
  const errors = [...result.errors];

  if (!isRecord(value)) {
    return result;
  }

  if (value.isBuiltIn !== false)
    errors.push("Custom chord progression must not be built in.");
  if (
    typeof value.id === "string" &&
    builtInChordProgressionIds.has(value.id)
  ) {
    errors.push(
      "Custom chord progression ID conflicts with a built-in progression.",
    );
  }
  if (!isCanonicalUtcIsoTimestamp(value.createdAt))
    errors.push("Custom chord progression creation date is required.");
  if (!isCanonicalUtcIsoTimestamp(value.updatedAt))
    errors.push("Custom chord progression update date is required.");
  if (
    isCanonicalUtcIsoTimestamp(value.createdAt) &&
    isCanonicalUtcIsoTimestamp(value.updatedAt) &&
    Date.parse(value.updatedAt) < Date.parse(value.createdAt)
  ) {
    errors.push(
      "Custom chord progression update date cannot precede its creation date.",
    );
  }

  return { errors, success: errors.length === 0 };
}

export function validatePracticePresetConfiguration(
  value: unknown,
): PracticeValidationResult {
  const errors: string[] = [];

  if (!isRecord(value)) {
    return {
      errors: ["Practice preset configuration must be an object."],
      success: false,
    };
  }

  if (!hasBoundedText(value.patternId, MAX_ID_LENGTH))
    errors.push("Practice preset pattern ID is invalid.");
  if (!isBpm(value.bpm)) errors.push("Practice preset BPM is invalid.");
  if (!isCountInMeasures(value.countInMeasures))
    errors.push("Practice preset count-in is invalid.");
  if (!isSwing(value.swing)) errors.push("Practice preset swing is invalid.");
  if (!isUnit(value.humanization))
    errors.push("Practice preset humanization is invalid.");
  if (!isFillFrequency(value.fillFrequency))
    errors.push("Practice preset fill frequency is invalid.");
  if (!validateGuidedPracticeConfiguration(value.guidedPractice).success)
    errors.push("Practice preset guided practice configuration is invalid.");

  return { errors, success: errors.length === 0 };
}

export function validatePracticePresetInput(
  value: unknown,
): PracticeValidationResult {
  const errors: string[] = [];

  if (!isRecord(value)) {
    return {
      errors: ["Practice preset input must be an object."],
      success: false,
    };
  }

  if (!hasBoundedText(value.name, MAX_NAME_LENGTH))
    errors.push(
      "Practice preset name is required and must be 100 characters or fewer.",
    );
  if (!validatePracticePresetConfiguration(value.configuration).success)
    errors.push("Practice preset configuration is invalid.");
  if (value.isFavorite !== undefined && typeof value.isFavorite !== "boolean")
    errors.push("Practice preset favorite status must be a boolean.");

  return { errors, success: errors.length === 0 };
}

export function validatePracticePreset(
  value: unknown,
): PracticeValidationResult {
  const errors: string[] = [];

  if (!isRecord(value)) {
    return { errors: ["Practice preset must be an object."], success: false };
  }

  const inputResult = validatePracticePresetInput(value);
  if (!inputResult.success) errors.push(...inputResult.errors);
  if (!hasBoundedText(value.id, MAX_ID_LENGTH))
    errors.push("Practice preset ID is invalid.");
  if (typeof value.isFavorite !== "boolean")
    errors.push("Practice preset favorite status is required.");
  if (
    value.lastUsedAt !== null &&
    !isCanonicalUtcIsoTimestamp(value.lastUsedAt)
  )
    errors.push("Practice preset last-used date is invalid.");
  if (!isCanonicalUtcIsoTimestamp(value.createdAt))
    errors.push("Practice preset creation date is invalid.");
  if (!isCanonicalUtcIsoTimestamp(value.updatedAt))
    errors.push("Practice preset update date is invalid.");
  if (
    isCanonicalUtcIsoTimestamp(value.createdAt) &&
    isCanonicalUtcIsoTimestamp(value.updatedAt) &&
    Date.parse(value.updatedAt) < Date.parse(value.createdAt)
  ) {
    errors.push(
      "Practice preset update date cannot precede its creation date.",
    );
  }

  return { errors, success: errors.length === 0 };
}

export function isTempoTrainerConfiguration(
  value: unknown,
): value is TempoTrainerConfiguration {
  return validateTempoTrainerConfiguration(value).success;
}

export function isCustomChordProgression(
  value: unknown,
): value is CustomChordProgression {
  return validateCustomChordProgression(value).success;
}

export function isChordTrainerConfiguration(
  value: unknown,
): value is ChordTrainerConfiguration {
  return validateChordTrainerConfiguration(value).success;
}

export function isStrummingPattern(value: unknown): value is StrummingPattern {
  return validateStrummingPattern(value).success;
}

export function isGuidedPracticeConfiguration(
  value: unknown,
): value is GuidedPracticeConfiguration {
  return validateGuidedPracticeConfiguration(value).success;
}

export function isPracticePresetConfiguration(
  value: unknown,
): value is PracticePresetConfiguration {
  return validatePracticePresetConfiguration(value).success;
}

export function isPracticePreset(value: unknown): value is PracticePreset {
  return validatePracticePreset(value).success;
}
