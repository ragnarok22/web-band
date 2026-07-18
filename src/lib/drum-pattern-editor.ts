import { getPatternStepCount, getStepsPerBar } from "@/lib/musical-time";
import type { CustomDrumPattern } from "@/types/persistence";
import type {
  DrumHit,
  DrumInstrument,
  DrumPattern,
  TimeSignature,
} from "@/types/pattern";

export const editorInstruments: readonly DrumInstrument[] = [
  "crash",
  "ride",
  "openHat",
  "closedHat",
  "highTom",
  "midTom",
  "lowTom",
  "snare",
  "rim",
  "clap",
  "kick",
];

export const supportedTimeSignatures: readonly TimeSignature[] = [
  { denominator: 4, numerator: 2 },
  { denominator: 4, numerator: 3 },
  { denominator: 4, numerator: 4 },
  { denominator: 4, numerator: 5 },
  { denominator: 8, numerator: 6 },
  { denominator: 8, numerator: 7 },
  { denominator: 8, numerator: 12 },
];

interface DraftDependencies {
  createId?: () => string;
  now?: () => string;
}

export interface MeasureClipboard {
  hits: Array<Omit<DrumHit, "id">>;
  stepCount: number;
}

export interface PatternStructureChanges {
  bars?: 1 | 2 | 4;
  subdivision?: 8 | 16;
  timeSignature?: TimeSignature;
}

export interface AdvancedHitChanges {
  flam: boolean;
  probability: number;
  timingOffset: number;
  velocity: number;
}

function createUniqueId(
  prefix: "custom" | "hit",
  unavailableIds: Set<string>,
  createId: () => string,
): string {
  for (let attempt = 0; attempt < 100; attempt += 1) {
    const id = `${prefix}-${createId()}`;
    if (!unavailableIds.has(id)) {
      unavailableIds.add(id);
      return id;
    }
  }
  throw new Error("A unique pattern ID could not be created.");
}

function dependencies({ createId, now }: DraftDependencies = {}) {
  return {
    createId: createId ?? (() => crypto.randomUUID()),
    now: now ?? (() => new Date().toISOString()),
  };
}

function withHits(
  pattern: CustomDrumPattern,
  hits: DrumHit[],
): CustomDrumPattern {
  return { ...pattern, hits };
}

function clamp(value: number, minimum: number, maximum: number): number {
  return Math.min(maximum, Math.max(minimum, value));
}

export function createDefaultPatternDraft(
  unavailableIds: readonly string[] = [],
  draftDependencies?: DraftDependencies,
): CustomDrumPattern {
  const { createId, now } = dependencies(draftDependencies);
  const timestamp = now();
  return {
    bars: 1,
    category: "rock",
    createdAt: timestamp,
    defaultBpm: 90,
    description: "",
    difficulty: "beginner",
    hits: [],
    id: createUniqueId("custom", new Set(unavailableIds), createId),
    isBuiltIn: false,
    name: "Untitled pattern",
    recommendedBpmRange: { max: 130, min: 70 },
    subdivision: 16,
    timeSignature: { denominator: 4, numerator: 4 },
    updatedAt: timestamp,
  };
}

export function duplicatePatternDraft(
  source: DrumPattern,
  unavailableIds: readonly string[],
  draftDependencies?: DraftDependencies,
): CustomDrumPattern {
  const { createId, now } = dependencies(draftDependencies);
  const timestamp = now();
  const unavailablePatternIds = new Set([...unavailableIds, source.id]);
  const unavailableHitIds = new Set(source.hits.map(({ id }) => id));
  return {
    ...structuredClone(source),
    createdAt: timestamp,
    hits: source.hits.map((hit) => ({
      ...structuredClone(hit),
      id: createUniqueId("hit", unavailableHitIds, createId),
    })),
    id: createUniqueId("custom", unavailablePatternIds, createId),
    isBuiltIn: false,
    name: `${source.name} copy`,
    updatedAt: timestamp,
  };
}

export function resizePatternDraft(
  pattern: CustomDrumPattern,
  changes: PatternStructureChanges,
): CustomDrumPattern {
  const subdivision = changes.subdivision ?? pattern.subdivision;
  const resized: CustomDrumPattern = {
    ...pattern,
    ...changes,
    subdivision,
    timeSignature: changes.timeSignature
      ? { ...changes.timeSignature }
      : pattern.timeSignature,
  };
  const stepScale = subdivision / pattern.subdivision;
  const stepCount = getPatternStepCount(resized);
  const hits = pattern.hits.flatMap((hit) => {
    const step = hit.step * stepScale;
    return Number.isInteger(step) && step < stepCount ? [{ ...hit, step }] : [];
  });
  return withHits(resized, hits);
}

export function cyclePatternCell(
  pattern: CustomDrumPattern,
  instrument: DrumInstrument,
  step: number,
  createId: () => string = () => crypto.randomUUID(),
): CustomDrumPattern {
  const existing = pattern.hits.find(
    (hit) => hit.instrument === instrument && hit.step === step,
  );
  if (!existing) {
    const ids = new Set(pattern.hits.map(({ id }) => id));
    return withHits(pattern, [
      ...pattern.hits,
      {
        id: createUniqueId("hit", ids, createId),
        instrument,
        step,
        velocity: 0.7,
      },
    ]);
  }
  if (existing.velocity >= 1) {
    return withHits(
      pattern,
      pattern.hits.filter(({ id }) => id !== existing.id),
    );
  }
  const velocity =
    existing.velocity < 0.7 ? 0.7 : existing.velocity < 0.85 ? 0.85 : 1;
  return withHits(
    pattern,
    pattern.hits.map((hit) =>
      hit.id === existing.id ? { ...hit, velocity } : hit,
    ),
  );
}

export function togglePatternCell(
  pattern: CustomDrumPattern,
  instrument: DrumInstrument,
  step: number,
  createId: () => string = () => crypto.randomUUID(),
): CustomDrumPattern {
  const existing = pattern.hits.find(
    (hit) => hit.instrument === instrument && hit.step === step,
  );
  if (existing) {
    return withHits(
      pattern,
      pattern.hits.filter(({ id }) => id !== existing.id),
    );
  }
  const ids = new Set(pattern.hits.map(({ id }) => id));
  return withHits(pattern, [
    ...pattern.hits,
    {
      id: createUniqueId("hit", ids, createId),
      instrument,
      step,
      velocity: 0.85,
    },
  ]);
}

export function clearPatternRow(
  pattern: CustomDrumPattern,
  instrument: DrumInstrument,
): CustomDrumPattern {
  return withHits(
    pattern,
    pattern.hits.filter((hit) => hit.instrument !== instrument),
  );
}

export function clearPattern(pattern: CustomDrumPattern): CustomDrumPattern {
  return withHits(pattern, []);
}

export function copyPatternMeasure(
  pattern: CustomDrumPattern,
  measureIndex: number,
): MeasureClipboard {
  const stepCount = getStepsPerBar(pattern.timeSignature, pattern.subdivision);
  const start = measureIndex * stepCount;
  return {
    hits: pattern.hits
      .filter((hit) => hit.step >= start && hit.step < start + stepCount)
      .map((hit) => ({
        flam: hit.flam,
        instrument: hit.instrument,
        probability: hit.probability,
        step: hit.step - start,
        timingOffset: hit.timingOffset,
        velocity: hit.velocity,
      })),
    stepCount,
  };
}

export function pastePatternMeasure(
  pattern: CustomDrumPattern,
  measureIndex: number,
  clipboard: MeasureClipboard,
  createId: () => string = () => crypto.randomUUID(),
): CustomDrumPattern {
  const stepCount = getStepsPerBar(pattern.timeSignature, pattern.subdivision);
  const start = measureIndex * stepCount;
  const ids = new Set(pattern.hits.map(({ id }) => id));
  const retained = pattern.hits.filter(
    (hit) => hit.step < start || hit.step >= start + stepCount,
  );
  const pasted = clipboard.hits.map((hit) => ({
    ...structuredClone(hit),
    id: createUniqueId("hit", ids, createId),
    step:
      start +
      Math.min(
        stepCount - 1,
        Math.floor((hit.step / clipboard.stepCount) * stepCount),
      ),
  }));
  return withHits(pattern, [...retained, ...pasted]);
}

export function updateAdvancedHit(
  pattern: CustomDrumPattern,
  instrument: DrumInstrument,
  step: number,
  changes: AdvancedHitChanges,
  createId: () => string = () => crypto.randomUUID(),
): CustomDrumPattern {
  const existing = pattern.hits.find(
    (hit) => hit.instrument === instrument && hit.step === step,
  );
  const properties = {
    flam: changes.flam,
    probability: clamp(changes.probability, 0, 1),
    timingOffset: clamp(changes.timingOffset, -0.1, 0.1),
    velocity: clamp(changes.velocity, 0, 1),
  };
  if (existing) {
    return withHits(
      pattern,
      pattern.hits.map((hit) =>
        hit.id === existing.id ? { ...hit, ...properties } : hit,
      ),
    );
  }
  const ids = new Set(pattern.hits.map(({ id }) => id));
  return withHits(pattern, [
    ...pattern.hits,
    {
      ...properties,
      id: createUniqueId("hit", ids, createId),
      instrument,
      step,
    },
  ]);
}
