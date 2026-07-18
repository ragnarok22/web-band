import { describe, expect, it } from "vitest";

import { gDEmCProgression } from "@/data/chord-progressions";
import { basicPopPattern } from "@/data/strumming-patterns";
import {
  isGuidedPracticeConfiguration,
  isPracticePreset,
  isPracticeMode,
  isStrumAction,
  validateChordProgression,
  validateChordStep,
  validateChordTrainerConfiguration,
  validateCustomChordProgression,
  validateGuidedPracticeConfiguration,
  validatePracticePreset,
  validatePracticePresetConfiguration,
  validatePracticePresetInput,
  validateStrummingPattern,
  validateStrumStep,
  validateTempoTrainerConfiguration,
  validateTempoTrainerInterval,
} from "@/lib/practice-validation";
import type {
  GuidedPracticeConfiguration,
  TempoTrainerConfiguration,
} from "@/types/practice";
import type { PracticePreset } from "@/types/persistence";

const tempoTrainer: TempoTrainerConfiguration = {
  endBpm: 120,
  increment: 5,
  interval: { measures: 4, type: "measures" },
  resetToStartingBpmOnStop: true,
  startBpm: 80,
  stopAtTarget: true,
};

function createPreset(): PracticePreset {
  const timestamp = "2026-07-18T12:00:00.000Z";
  return {
    configuration: {
      bpm: 96,
      countInMeasures: 1,
      fillFrequency: 8,
      guidedPractice: {
        chordTrainer: {
          progression: gDEmCProgression,
          repeat: true,
          showCountdown: true,
        },
        mode: "chords",
      },
      humanization: 0.1,
      patternId: "basic-rock",
      swing: 0.2,
    },
    createdAt: timestamp,
    id: "warm-up",
    isFavorite: false,
    lastUsedAt: null,
    name: "Warm up",
    updatedAt: timestamp,
  };
}

describe("practice validation", () => {
  it("validates practice modes and every strum action", () => {
    expect(
      ["drums", "tempoTrainer", "chords", "strumming"].every(isPracticeMode),
    ).toBe(true);
    expect(["down", "up", "mute", "rest", "hold"].every(isStrumAction)).toBe(
      true,
    );
    expect(isPracticeMode("metronome")).toBe(false);
    expect(isStrumAction("accent")).toBe(false);
  });

  it("validates both tempo interval variants and complete configurations", () => {
    expect(
      validateTempoTrainerInterval({ measures: 2, type: "measures" }).success,
    ).toBe(true);
    expect(
      validateTempoTrainerInterval({ seconds: 15, type: "seconds" }).success,
    ).toBe(true);
    expect(validateTempoTrainerConfiguration(tempoTrainer).success).toBe(true);
    expect(
      validateTempoTrainerConfiguration({
        ...tempoTrainer,
        increment: 0,
        interval: { seconds: -1, type: "seconds" },
        startBpm: 20,
      }).errors,
    ).toEqual([
      "Starting BPM is invalid.",
      "Tempo increment must be a positive integer.",
      "Tempo trainer interval is invalid.",
    ]);
  });

  it("validates chord steps, progression metadata, and trainer settings", () => {
    expect(validateChordStep(gDEmCProgression.steps[0]).success).toBe(true);
    expect(validateChordProgression(gDEmCProgression).success).toBe(true);
    expect(
      validateChordTrainerConfiguration({
        progression: gDEmCProgression,
        repeat: true,
        showCountdown: false,
      }).success,
    ).toBe(true);
    expect(
      validateChordProgression({
        ...gDEmCProgression,
        createdAt: "not-a-date",
        steps: [gDEmCProgression.steps[0], { ...gDEmCProgression.steps[0] }],
      }).errors,
    ).toContain("Chord step IDs must be unique.");
    expect(
      validateChordStep({
        chord: "",
        duration: 0,
        durationUnit: "bars",
        id: "",
      }).success,
    ).toBe(false);
  });

  it("validates explicit, ordered strum subdivisions", () => {
    expect(validateStrumStep(basicPopPattern.steps[0]).success).toBe(true);
    expect(validateStrummingPattern(basicPopPattern).success).toBe(true);
    expect(
      validateStrummingPattern({
        ...basicPopPattern,
        steps: basicPopPattern.steps.slice(1),
      }).errors,
    ).toContain("Strumming pattern must define every subdivision.");
    expect(
      validateStrummingPattern({
        ...basicPopPattern,
        steps: basicPopPattern.steps.map((step, index) => ({
          ...step,
          subdivisionIndex: index === 1 ? 4 : step.subdivisionIndex,
        })),
      }).errors,
    ).toContain("Strum steps must be in subdivision order.");
    expect(
      validateStrumStep({
        accent: "yes",
        action: "pluck",
        id: "bad-step",
        subdivisionIndex: -1,
      }).success,
    ).toBe(false);
  });

  it("validates every guided practice configuration variant", () => {
    const configurations: GuidedPracticeConfiguration[] = [
      { mode: "drums" },
      { mode: "tempoTrainer", tempoTrainer },
      {
        chordTrainer: {
          progression: gDEmCProgression,
          repeat: true,
          showCountdown: true,
        },
        mode: "chords",
      },
      { mode: "strumming", strummingPattern: basicPopPattern },
    ];

    expect(configurations.every(isGuidedPracticeConfiguration)).toBe(true);
    expect(
      validateGuidedPracticeConfiguration({ mode: "tempoTrainer" }),
    ).toEqual({
      errors: ["tempoTrainer guided practice configuration is invalid."],
      success: false,
    });
    expect(
      validateGuidedPracticeConfiguration({ mode: "unknown" }).success,
    ).toBe(false);
  });

  it("requires complete custom chord progression metadata", () => {
    const timestamp = "2026-07-18T12:00:00.000Z";
    const customProgression = {
      ...structuredClone(gDEmCProgression),
      createdAt: timestamp,
      id: "custom-pop",
      isBuiltIn: false,
      updatedAt: timestamp,
    };

    expect(validateCustomChordProgression(customProgression).success).toBe(
      true,
    );
    expect(
      validateCustomChordProgression({
        ...customProgression,
        id: gDEmCProgression.id,
      }).errors,
    ).toContain(
      "Custom chord progression ID conflicts with a built-in progression.",
    );
    expect(
      validateCustomChordProgression({
        ...customProgression,
        createdAt: undefined,
      }).success,
    ).toBe(false);
    expect(
      validateCustomChordProgression({
        ...customProgression,
        steps: Array.from({ length: 65 }, (_, index) => ({
          chord: "C",
          duration: 1,
          durationUnit: "measures",
          id: `step-${index}`,
        })),
      }).success,
    ).toBe(false);
  });

  it("rejects offset and noncanonical persisted timestamps", () => {
    const customProgression = {
      ...structuredClone(gDEmCProgression),
      createdAt: "2026-07-18T12:00:00.000Z",
      id: "custom-pop",
      isBuiltIn: false,
      updatedAt: "2026-07-18T12:00:00.000Z",
    };
    const preset = createPreset();

    for (const timestamp of [
      "2026-07-18T14:00:00.000+02:00",
      "2026-07-18T12:00:00Z",
    ]) {
      expect(
        validateCustomChordProgression({
          ...customProgression,
          createdAt: timestamp,
          updatedAt: timestamp,
        }).success,
      ).toBe(false);
      expect(
        validatePracticePreset({
          ...preset,
          createdAt: timestamp,
          lastUsedAt: timestamp,
          updatedAt: timestamp,
        }).success,
      ).toBe(false);
    }
  });

  it("validates complete practice preset snapshots and inputs", () => {
    const preset = createPreset();

    expect(
      validatePracticePresetConfiguration(preset.configuration).success,
    ).toBe(true);
    expect(
      validatePracticePresetInput({
        configuration: preset.configuration,
        name: preset.name,
      }).success,
    ).toBe(true);
    expect(validatePracticePreset(preset).success).toBe(true);
    expect(isPracticePreset(preset)).toBe(true);
    expect(
      validatePracticePreset({
        ...preset,
        configuration: { ...preset.configuration, swing: 0.9 },
        lastUsedAt: "yesterday",
      }).success,
    ).toBe(false);
  });

  it("rejects non-object values for every structured validator", () => {
    const validators = [
      validateTempoTrainerInterval,
      validateTempoTrainerConfiguration,
      validateChordStep,
      validateChordProgression,
      validateChordTrainerConfiguration,
      validateStrumStep,
      validateStrummingPattern,
      validateGuidedPracticeConfiguration,
      validateCustomChordProgression,
      validatePracticePresetConfiguration,
      validatePracticePresetInput,
      validatePracticePreset,
    ];

    expect(validators.every((validator) => !validator(null).success)).toBe(
      true,
    );
  });
});
