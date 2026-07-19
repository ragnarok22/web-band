import type {
  FillArrangement,
  FillCell,
  SupportedFillMeter,
} from "@/types/fill";
import type { DrumInstrument, PatternCategory } from "@/types/pattern";

interface FillValidationResult {
  errors: string[];
  success: boolean;
}

const instruments: DrumInstrument[] = [
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
];

export const fillCategories: PatternCategory[] = [
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
];

export const fillMeters: SupportedFillMeter[] = [
  "2/4",
  "3/4",
  "4/4",
  "5/4",
  "6/8",
  "7/8",
  "12/8",
];

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function hasOnlyKeys(
  value: Record<string, unknown>,
  keys: readonly string[],
): boolean {
  return Object.keys(value).every((key) => keys.includes(key));
}

function hasUniqueValues(values: readonly unknown[]): boolean {
  return new Set(values).size === values.length;
}

function meterSteps(meter: SupportedFillMeter, subdivision: 8 | 16): number {
  const [numerator, denominator] = meter.split("/").map(Number);
  return numerator! * (subdivision / denominator!);
}

function validateCell(value: unknown, label: string, errors: string[]): void {
  if (!Array.isArray(value)) {
    errors.push(`${label} must be an array.`);
    return;
  }
  const seen = new Set<string>();
  for (const hit of value) {
    if (
      !isRecord(hit) ||
      !hasOnlyKeys(hit, ["instrument", "velocity"]) ||
      !instruments.includes(hit.instrument as DrumInstrument)
    ) {
      errors.push(`${label} contains an invalid instrument.`);
      continue;
    }
    if (
      typeof hit.velocity !== "number" ||
      !Number.isFinite(hit.velocity) ||
      hit.velocity <= 0 ||
      hit.velocity > 1
    ) {
      errors.push(`${label} velocity must be greater than 0 and at most 1.`);
    }
    if (seen.has(hit.instrument as string)) {
      errors.push(`${label} contains a duplicate instrument.`);
    }
    seen.add(hit.instrument as string);
  }
}

export function validateFillArrangement(value: unknown): FillValidationResult {
  const errors: string[] = [];
  if (!isRecord(value)) {
    return { errors: ["Fill arrangement must be an object."], success: false };
  }
  if (!hasOnlyKeys(value, ["compatibility", "id", "name", "tail"])) {
    errors.push("Fill arrangement contains unsupported fields.");
  }
  if (
    typeof value.id !== "string" ||
    !/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(value.id)
  ) {
    errors.push("Fill arrangement ID must use kebab-case.");
  }
  if (
    typeof value.name !== "string" ||
    value.name.trim() === "" ||
    value.name.length > 100
  ) {
    errors.push("Fill arrangement name is invalid.");
  }

  const compatibility = value.compatibility;
  let categories: PatternCategory[] = [];
  let meters: SupportedFillMeter[] = [];
  if (
    !isRecord(compatibility) ||
    !hasOnlyKeys(compatibility, ["categories", "meters"])
  ) {
    errors.push("Fill compatibility is invalid.");
  } else {
    categories = Array.isArray(compatibility.categories)
      ? (compatibility.categories as PatternCategory[])
      : [];
    meters = Array.isArray(compatibility.meters)
      ? (compatibility.meters as SupportedFillMeter[])
      : [];
    if (
      categories.length === 0 ||
      !categories.every((category) => fillCategories.includes(category)) ||
      !hasUniqueValues(categories)
    ) {
      errors.push("Fill categories must be valid and unique.");
    }
    if (
      meters.length === 0 ||
      !meters.every((meter) => fillMeters.includes(meter)) ||
      !hasUniqueValues(meters)
    ) {
      errors.push("Fill meters must be valid and unique.");
    }
  }

  if (!isRecord(value.tail) || !hasOnlyKeys(value.tail, ["8", "16"])) {
    errors.push("Fill tail must define only eighth and sixteenth grids.");
  } else {
    for (const subdivision of [8, 16] as const) {
      const cells = value.tail[subdivision];
      if (!Array.isArray(cells) || cells.length === 0) {
        errors.push(`Fill ${subdivision}th-note tail cannot be empty.`);
        continue;
      }
      cells.forEach((cell, index) =>
        validateCell(cell, `Fill ${subdivision} cell ${index + 1}`, errors),
      );
      if ((cells.at(-1) as FillCell | undefined)?.length === 0) {
        errors.push(`Fill ${subdivision}th-note final cell cannot be silent.`);
      }
      if (
        meters.some(
          (meter) =>
            cells.length > Math.floor(meterSteps(meter, subdivision) / 2),
        )
      ) {
        errors.push(`Fill ${subdivision}th-note tail exceeds half a bar.`);
      }
    }
  }
  return { errors, success: errors.length === 0 };
}

export function validateFillLibrary(
  value: readonly FillArrangement[],
): FillValidationResult {
  const errors: string[] = [];
  const ids = value.map(({ id }) => id);
  if (!hasUniqueValues(ids))
    errors.push("Fill arrangement IDs must be unique.");
  for (const arrangement of value) {
    const result = validateFillArrangement(arrangement);
    errors.push(...result.errors.map((error) => `${arrangement.id}: ${error}`));
  }
  for (const category of fillCategories) {
    for (const meter of fillMeters) {
      if (
        !value.some(
          ({ compatibility }) =>
            compatibility.categories.includes(category) &&
            compatibility.meters.includes(meter),
        )
      ) {
        errors.push(
          `Fill library is missing a compatible fill for ${category} ${meter}.`,
        );
      }
    }
  }
  return { errors, success: errors.length === 0 };
}
