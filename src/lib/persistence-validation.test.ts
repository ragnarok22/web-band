import { describe, expect, it } from "vitest";

import { gDEmCProgression } from "@/data/chord-progressions";
import { basicRockPattern } from "@/data/patterns";
import { basicPopPattern } from "@/data/strumming-patterns";
import { defaultPracticeSettings } from "@/db/repositories/settings-repository";
import {
  isBackupEnvelope,
  isCustomDrumPattern,
  isCustomStrummingPattern,
  isHistorySettings,
  isPracticeSession,
  MAX_BACKUP_COLLECTION_RECORDS,
  validateBackupEnvelope,
  validateCustomDrumPattern,
  validateCustomStrummingPattern,
  validateHistorySettings,
  validatePracticeSession,
} from "@/lib/persistence-validation";
import type {
  BackupEnvelope,
  CustomChordProgression,
  CustomDrumPattern,
  CustomStrummingPattern,
  PracticePreset,
  PracticeSession,
} from "@/types/persistence";

const createdAt = "2026-07-18T10:00:00.000Z";
const updatedAt = "2026-07-18T12:00:00.000Z";

function createDrumPattern(id = "custom-rock"): CustomDrumPattern {
  return {
    ...structuredClone(basicRockPattern),
    createdAt,
    id,
    isBuiltIn: false,
    name: "Custom Rock",
    updatedAt,
  };
}

function createStrummingPattern(
  id = "custom-pop-strumming",
): CustomStrummingPattern {
  return {
    ...structuredClone(basicPopPattern),
    createdAt,
    id,
    isBuiltIn: false,
    name: "Custom Pop Strumming",
    updatedAt,
  };
}

function createSession(id = "session-1"): PracticeSession {
  return {
    category: "rock",
    createdAt,
    durationSeconds: 120,
    endedAt: "2026-07-18T10:02:00.000Z",
    endingBpm: 110,
    id,
    patternId: "custom-rock",
    patternName: "Custom Rock",
    practiceMode: "drums",
    startedAt: createdAt,
    startingBpm: 90,
    timeSignature: "4/4",
    updatedAt,
  };
}

function createChordProgression(): CustomChordProgression {
  return {
    ...structuredClone(gDEmCProgression),
    createdAt,
    id: "custom-chords",
    isBuiltIn: false,
    name: "Custom Chords",
    updatedAt,
  };
}

function createPreset(): PracticePreset {
  return {
    configuration: {
      bpm: 90,
      countInMeasures: 1,
      fillFrequency: null,
      guidedPractice: { mode: "drums" },
      humanization: 0,
      patternId: "custom-rock",
      swing: 0,
    },
    createdAt,
    id: "preset-1",
    isFavorite: false,
    lastUsedAt: null,
    name: "Preset One",
    updatedAt,
  };
}

function createBackup(): BackupEnvelope {
  return {
    app: "web-band",
    data: {
      customChordProgressions: [createChordProgression()],
      customPatterns: [createDrumPattern()],
      customStrummingPatterns: [createStrummingPattern()],
      favoriteChordProgressionIds: ["custom-chords"],
      favoritePatternIds: ["custom-rock"],
      preferences: {
        appearance: { reducedMotion: true, theme: "system" },
        onboardingDismissed: true,
        recentPatternIds: ["custom-rock", "basic-rock"],
      },
      practicePresets: [createPreset()],
      practiceSessions: [createSession()],
      settings: {
        guidedPractice: {
          chordTrainer: {
            progression: structuredClone(gDEmCProgression),
            repeat: true,
            showCountdown: true,
          },
          mode: "drums",
          strummingPattern: structuredClone(basicPopPattern),
          tempoTrainer: {
            endBpm: 120,
            increment: 5,
            interval: { measures: 4, type: "measures" },
            resetToStartingBpmOnStop: true,
            startBpm: 80,
            stopAtTarget: true,
          },
        },
        history: { enabled: true, minimumDurationSeconds: 30 },
        practice: structuredClone(defaultPracticeSettings),
      },
    },
    exportedAt: updatedAt,
    version: 3,
  };
}

describe("persistence validation", () => {
  it("strictly validates custom drum patterns and built-in ID collisions", () => {
    const pattern = createDrumPattern();
    expect(validateCustomDrumPattern(pattern).success).toBe(true);
    expect(isCustomDrumPattern(pattern)).toBe(true);
    expect(
      validateCustomDrumPattern({ ...pattern, id: basicRockPattern.id }).errors,
    ).toContain("Custom drum pattern ID conflicts with a built-in pattern.");
    expect(
      validateCustomDrumPattern({
        ...pattern,
        createdAt: "2026-07-18T12:00:00Z",
      }).success,
    ).toBe(false);
    expect(
      validateCustomDrumPattern({ ...pattern, unexpected: true }).errors,
    ).toContain("Custom drum pattern contains unsupported fields.");
    expect(
      validateCustomDrumPattern({
        ...pattern,
        hits: [pattern.hits[0], { ...pattern.hits[0]! }],
      }).errors,
    ).toContain("Custom drum pattern hit IDs must be valid and unique.");
    expect(
      validateCustomDrumPattern({
        ...pattern,
        hits: [pattern.hits[0], { ...pattern.hits[0]!, id: "duplicate-cell" }],
      }).errors,
    ).toContain("Custom drum pattern hits must use unique instrument cells.");
  });

  it("validates bounded custom strumming patterns with canonical metadata", () => {
    const pattern = createStrummingPattern();
    expect(validateCustomStrummingPattern(pattern).success).toBe(true);
    expect(isCustomStrummingPattern(pattern)).toBe(true);
    expect(
      validateCustomStrummingPattern({ ...pattern, id: basicPopPattern.id })
        .success,
    ).toBe(false);
    expect(
      validateCustomStrummingPattern({
        ...pattern,
        name: "x".repeat(101),
        updatedAt: "2026-07-18T09:00:00.000Z",
      }).success,
    ).toBe(false);
    expect(
      validateCustomStrummingPattern({
        ...pattern,
        createdAt: undefined,
      }).success,
    ).toBe(false);
  });

  it("validates strict, bounded practice sessions and history settings", () => {
    const session = createSession();
    expect(validatePracticeSession(session).success).toBe(true);
    expect(isPracticeSession(session)).toBe(true);
    expect(
      validatePracticeSession({
        ...session,
        durationSeconds: 0,
        endedAt: "2026-07-18T09:59:00.000Z",
        practiceMode: "unknown",
      }).success,
    ).toBe(false);
    expect(
      validatePracticeSession({ ...session, extra: "field" }).errors,
    ).toContain("Practice session fields are invalid.");
    expect(
      validatePracticeSession({ ...session, durationSeconds: 60 }).success,
    ).toBe(true);
    expect(
      validatePracticeSession({ ...session, durationSeconds: 121 }).errors,
    ).toContain("Practice session duration cannot exceed elapsed time.");
    expect(
      validatePracticeSession({
        ...session,
        durationSeconds: 1,
        endedAt: "2026-07-18T10:00:00.001Z",
      }).success,
    ).toBe(true);

    const settings = { enabled: true, minimumDurationSeconds: 30 };
    expect(validateHistorySettings(settings).success).toBe(true);
    expect(isHistorySettings(settings)).toBe(true);
    expect(
      validateHistorySettings({ ...settings, minimumDurationSeconds: 3_601 })
        .success,
    ).toBe(false);
    expect(validateHistorySettings({ ...settings, extra: true }).success).toBe(
      false,
    );
    expect(
      validateHistorySettings({ ...settings, minimumDurationSeconds: 0 })
        .success,
    ).toBe(false);
  });

  it("validates a complete version 3 backup without mutating it", () => {
    const backup = createBackup();
    const before = structuredClone(backup);

    expect(validateBackupEnvelope(backup)).toEqual({
      errors: [],
      success: true,
    });
    expect(isBackupEnvelope(backup)).toBe(true);
    expect(backup).toEqual(before);
  });

  it("rejects unknown app IDs, versions, fields, and noncanonical dates", () => {
    const backup = createBackup();
    expect(
      validateBackupEnvelope({ ...backup, app: "other-app" }).success,
    ).toBe(false);
    expect(validateBackupEnvelope({ ...backup, version: 4 }).success).toBe(
      false,
    );
    expect(
      validateBackupEnvelope({
        ...backup,
        data: {
          ...backup.data,
          settings: {
            ...backup.data.settings,
            practice: {
              ...backup.data.settings.practice,
              soundCharacter: "unknown",
            },
          },
        },
      }).success,
    ).toBe(false);
    expect(
      validateBackupEnvelope({
        ...backup,
        exportedAt: "2026-07-18T14:00:00.000+02:00",
      }).success,
    ).toBe(false);
    expect(
      validateBackupEnvelope({ ...backup, executable: "alert(1)" }).success,
    ).toBe(false);
  });

  it("strictly validates complete portable preferences", () => {
    const backup = createBackup();

    backup.data.preferences.recentPatternIds = ["missing-pattern"];
    expect(validateBackupEnvelope(backup).errors).toContain(
      "Recent pattern ID missing-pattern is not included in this backup.",
    );

    backup.data.preferences = {
      appearance: { reducedMotion: false, theme: "dark" },
      onboardingDismissed: false,
      recentPatternIds: Array.from({ length: 21 }, (_, index) =>
        index === 0 ? "basic-rock" : `pattern-${index}`,
      ),
    };
    expect(validateBackupEnvelope(backup).errors).toContain(
      "Backup preferences are invalid.",
    );
  });

  it("rejects duplicate IDs in every backup collection", () => {
    const collectionKeys = [
      "customPatterns",
      "favoritePatternIds",
      "customChordProgressions",
      "favoriteChordProgressionIds",
      "customStrummingPatterns",
      "practicePresets",
      "practiceSessions",
    ] as const;

    for (const key of collectionKeys) {
      const backup = createBackup();
      const collection = backup.data[key] as unknown[];
      collection.push(structuredClone(collection[0]));
      expect(validateBackupEnvelope(backup).success, key).toBe(false);
    }
  });

  it("caps individual backup collections before validating their records", () => {
    const backup = createBackup();
    backup.data.favoritePatternIds = Array.from(
      { length: MAX_BACKUP_COLLECTION_RECORDS + 1 },
      (_, index) => `favorite-${index}`,
    );

    expect(validateBackupEnvelope(backup).errors).toContain(
      `Favorite pattern IDs cannot contain more than ${MAX_BACKUP_COLLECTION_RECORDS} records.`,
    );
  });

  it("requires standalone backup pattern references to resolve", () => {
    const cases = [
      {
        expected:
          "Favorite pattern ID missing-pattern is not included in this backup.",
        mutate: (backup: BackupEnvelope) => {
          backup.data.favoritePatternIds = ["missing-pattern"];
        },
      },
      {
        expected:
          "Practice settings pattern ID missing-pattern is not included in this backup.",
        mutate: (backup: BackupEnvelope) => {
          backup.data.settings.practice.selectedPatternId = "missing-pattern";
        },
      },
      {
        expected:
          "Practice preset preset-1 pattern ID missing-pattern is not included in this backup.",
        mutate: (backup: BackupEnvelope) => {
          backup.data.practicePresets[0]!.configuration.patternId =
            "missing-pattern";
        },
      },
    ];

    for (const { expected, mutate } of cases) {
      const backup = createBackup();
      mutate(backup);
      expect(validateBackupEnvelope(backup).errors).toContain(expected);
    }
  });

  it("requires standalone favorite chord progression references to resolve", () => {
    const backup = createBackup();
    backup.data.favoriteChordProgressionIds = ["missing-progression"];

    expect(validateBackupEnvelope(backup).errors).toContain(
      "Favorite chord progression ID missing-progression is not included in this backup.",
    );
  });

  it("requires standalone custom strumming references to resolve", () => {
    const backup = createBackup();
    const customPattern = createStrummingPattern();
    backup.data.settings.guidedPractice.strummingPattern = customPattern;
    expect(validateBackupEnvelope(backup).success).toBe(true);

    backup.data.customStrummingPatterns = [];
    expect(validateBackupEnvelope(backup).errors).toContain(
      `Guided practice strumming pattern ID ${customPattern.id} is not included in this backup.`,
    );

    const presetBackup = createBackup();
    presetBackup.data.practicePresets[0]!.configuration.guidedPractice = {
      mode: "strumming",
      strummingPattern: customPattern,
    };
    expect(validateBackupEnvelope(presetBackup).success).toBe(true);
    presetBackup.data.customStrummingPatterns = [];
    expect(validateBackupEnvelope(presetBackup).errors).toContain(
      `Practice preset preset-1 strumming pattern ID ${customPattern.id} is not included in this backup.`,
    );
  });

  it("rejects custom chord progressions that collide with built-in IDs", () => {
    const backup = createBackup();
    backup.data.customChordProgressions[0]!.id = gDEmCProgression.id;
    backup.data.favoriteChordProgressionIds = [gDEmCProgression.id];

    expect(validateBackupEnvelope(backup).errors).toContain(
      "Custom chord progressions contains an invalid record.",
    );
  });

  it("allows built-in references and historical session snapshots", () => {
    const backup = createBackup();
    backup.data.favoritePatternIds = [basicRockPattern.id];
    backup.data.favoriteChordProgressionIds = [gDEmCProgression.id];
    backup.data.practicePresets[0]!.configuration.patternId =
      basicRockPattern.id;
    backup.data.settings.practice.selectedPatternId = basicRockPattern.id;
    backup.data.practiceSessions[0]!.patternId = "removed-historical-pattern";

    expect(validateBackupEnvelope(backup)).toEqual({
      errors: [],
      success: true,
    });
  });
});
