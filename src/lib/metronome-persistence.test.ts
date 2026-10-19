import { describe, expect, it } from "vitest";
import { createDefaultMetronomeConfiguration } from "@/lib/metronome";
import { isMetronomeConfiguration } from "@/lib/metronome-validation";
import { validatePracticePresetConfiguration } from "@/lib/practice-validation";
import { validatePracticeSession } from "@/lib/persistence-validation/history";
import {
  createBackupEnvelope,
  defaultBackupPreferences,
  normalizeBackupEnvelope,
} from "@/lib/backup-envelope";
import { defaultPracticeSettings } from "@/db/repositories/settings-repository";
import { createDefaultGuidedPracticeValues } from "@/stores/guided-practice-store";
import { MemoryPracticePresetRepository } from "@/db/repositories/practice-preset-repository";
import type {
  MetronomePracticeSession,
  PersistenceSnapshot,
  PracticePreset,
} from "@/types/persistence";

const timestamp = "2026-10-19T12:00:00.000Z";
const config = createDefaultMetronomeConfiguration();
const session: MetronomePracticeSession = {
  id: "metronome-session",
  startedAt: timestamp,
  endedAt: "2026-10-19T12:01:00.000Z",
  createdAt: timestamp,
  updatedAt: timestamp,
  durationSeconds: 60,
  startingBpm: 80,
  endingBpm: 80,
  timeSignature: "4/4",
  practiceMode: "metronome",
  metronome: { trainingMode: "progressive", subdivision: 1 },
};
const preset: PracticePreset = {
  id: "metronome-preset",
  name: "Subdivision ladder",
  createdAt: timestamp,
  updatedAt: timestamp,
  lastUsedAt: null,
  isFavorite: false,
  configuration: {
    bpm: 80,
    countInMeasures: 1,
    guidedPractice: { mode: "metronome", metronome: config },
  },
};
const snapshot: PersistenceSnapshot = {
  customPatterns: [],
  customChordProgressions: [],
  customStrummingPatterns: [],
  favoritePatternIds: [],
  favoriteChordProgressionIds: [],
  practicePresets: [preset],
  practiceSessions: [session],
};

describe("metronome persistence boundaries", () => {
  it("validates presets and sessions without fake drum fields", async () => {
    expect(
      validatePracticePresetConfiguration(preset.configuration).success,
    ).toBe(true);
    expect(validatePracticeSession(session).success).toBe(true);
    expect(
      validatePracticePresetConfiguration({
        ...preset.configuration,
        patternId: "basic-rock",
      }).success,
    ).toBe(false);
    expect(
      validatePracticeSession({ ...session, patternName: "Basic Rock" })
        .success,
    ).toBe(false);
    const repository = new MemoryPracticePresetRepository();
    await repository.put(preset);
    const restored = await repository.get(preset.id);
    expect(restored).toEqual(preset);
    expect(restored?.configuration).not.toHaveProperty("patternId");
  });

  it.each([
    { subdivision: 5 },
    { metronomeVolume: NaN },
    { subdivisionVolume: -0.1 },
    { accentIntensity: Infinity },
    { timeSignature: { numerator: 7, denominator: 8 } },
    { accentPattern: [true] },
    { measuresPerStage: 3 },
    { endBehavior: "sometimes" },
    { trainingMode: "tempoTrainer" },
  ])("rejects corrupt configuration %o", (changes) => {
    expect(isMetronomeConfiguration({ ...config, ...changes })).toBe(false);
  });

  it("round-trips a version 5 metronome backup by value", () => {
    const envelope = createBackupEnvelope(
      snapshot,
      {
        practice: structuredClone(defaultPracticeSettings),
        history: { enabled: true, minimumDurationSeconds: 1 },
        guidedPractice: {
          ...createDefaultGuidedPracticeValues(),
          mode: "metronome",
          metronome: config,
        },
      },
      defaultBackupPreferences,
    );
    expect(
      normalizeBackupEnvelope(JSON.parse(JSON.stringify(envelope))),
    ).toEqual(envelope);
    expect(envelope.data.practiceSessions[0]).not.toHaveProperty("patternId");
  });

  it("migrates version 4 settings while preserving presets and history", () => {
    const { metronome: defaults, ...legacyGuided } =
      createDefaultGuidedPracticeValues();
    const old = {
      app: "web-band",
      version: 4,
      exportedAt: timestamp,
      data: {
        ...snapshot,
        practicePresets: [],
        practiceSessions: [],
        preferences: defaultBackupPreferences,
        settings: {
          practice: {
            ...defaultPracticeSettings,
            bpm: 105,
            bpmAdjustmentStep: 5,
            restoreLastPractice: false,
          },
          history: { enabled: false, minimumDurationSeconds: 20 },
          guidedPractice: legacyGuided,
        },
      },
    };
    const before = structuredClone(old);
    const migrated = normalizeBackupEnvelope(old);
    expect(migrated.version).toBe(5);
    expect(migrated.data.settings.guidedPractice.metronome).toEqual(defaults);
    expect(migrated.data.settings.practice).toMatchObject({
      bpm: 105,
      bpmAdjustmentStep: 5,
      restoreLastPractice: false,
    });
    expect(migrated.data.settings.history).toEqual(old.data.settings.history);
    expect(old).toEqual(before);
  });
});
