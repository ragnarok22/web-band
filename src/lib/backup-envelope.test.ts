import { describe, expect, it } from "vitest";

import { basicPopPattern } from "@/data/strumming-patterns";
import { defaultPracticeSettings } from "@/db/repositories/settings-repository";
import {
  createBackupEnvelope,
  defaultBackupPreferences,
  MAX_BACKUP_FILE_BYTES,
  parseBackupText,
  serializeBackupEnvelope,
} from "@/lib/backup-envelope";
import { createDefaultGuidedPracticeValues } from "@/stores/guided-practice-store";
import type { BackupSettings, PersistenceSnapshot } from "@/types/persistence";

const emptySnapshot: PersistenceSnapshot = {
  customChordProgressions: [],
  customPatterns: [],
  customStrummingPatterns: [],
  favoriteChordProgressionIds: [],
  favoritePatternIds: [],
  practicePresets: [],
  practiceSessions: [],
};

function settings(): BackupSettings {
  return {
    guidedPractice: {
      ...createDefaultGuidedPracticeValues(),
      strummingPattern: structuredClone(basicPopPattern),
    },
    history: { enabled: true, minimumDurationSeconds: 30 },
    practice: structuredClone(defaultPracticeSettings),
  };
}

describe("backup envelope", () => {
  it("creates a detached, canonical version 3 envelope", () => {
    const snapshot = structuredClone(emptySnapshot);
    const backupSettings = settings();
    const envelope = createBackupEnvelope(
      snapshot,
      backupSettings,
      defaultBackupPreferences,
      new Date("2026-07-18T12:34:56.789Z"),
    );

    expect(envelope).toMatchObject({
      app: "web-band",
      exportedAt: "2026-07-18T12:34:56.789Z",
      version: 3,
    });
    backupSettings.practice.bpm = 150;
    snapshot.favoritePatternIds.push("later");
    expect(envelope.data.settings.practice.bpm).toBe(90);
    expect(envelope.data.favoritePatternIds).toEqual([]);
  });

  it("serializes formatted JSON and returns a typed count preview", () => {
    const envelope = createBackupEnvelope(
      emptySnapshot,
      settings(),
      defaultBackupPreferences,
      new Date("2026-07-18T12:34:56.789Z"),
    );
    const serialized = serializeBackupEnvelope(envelope);

    expect(serialized).toContain('\n  "app": "web-band"');
    expect(serialized.endsWith("\n")).toBe(true);
    const parsed = parseBackupText(serialized, "backup.json");
    expect(parsed).toMatchObject({
      byteSize: new TextEncoder().encode(serialized).byteLength,
      exportedAt: "2026-07-18T12:34:56.789Z",
      fileName: "backup.json",
      totalRecords: 0,
    });
    expect(parsed.counts.practiceSessions).toBe(0);
    expect(parsed.envelope).toEqual(envelope);
  });

  it("strictly migrates version 1 backups to current defaults", () => {
    const current = createBackupEnvelope(
      emptySnapshot,
      settings(),
      defaultBackupPreferences,
      new Date("2026-07-18T12:34:56.789Z"),
    );
    const legacyPractice = structuredClone(
      current.data.settings.practice,
    ) as unknown as Record<string, unknown>;
    delete legacyPractice.soundCharacter;
    const legacy = {
      ...current,
      data: structuredClone(current.data) as unknown as Record<string, unknown>,
      version: 1,
    };
    delete legacy.data.preferences;
    const legacySettings = legacy.data.settings as Record<string, unknown>;
    legacySettings.practice = legacyPractice;
    const before = structuredClone(legacy);

    const parsed = parseBackupText(JSON.stringify(legacy));

    expect(parsed.envelope.version).toBe(3);
    expect(parsed.envelope.data.settings.practice.soundCharacter).toBe(
      "balanced",
    );
    expect(parsed.envelope.data.preferences).toEqual(defaultBackupPreferences);
    expect(legacy).toEqual(before);
  });

  it("migrates version 2 history zero and missing preferences", () => {
    const current = createBackupEnvelope(
      emptySnapshot,
      settings(),
      defaultBackupPreferences,
      new Date("2026-07-18T12:34:56.789Z"),
    );
    const legacy = {
      ...current,
      data: structuredClone(current.data) as unknown as Record<string, unknown>,
      version: 2,
    };
    delete legacy.data.preferences;
    const legacySettings = legacy.data.settings as {
      history: { minimumDurationSeconds: number };
    };
    legacySettings.history.minimumDurationSeconds = 0;

    const parsed = parseBackupText(JSON.stringify(legacy));

    expect(parsed.envelope.version).toBe(3);
    expect(parsed.envelope.data.settings.history.minimumDurationSeconds).toBe(
      1,
    );
    expect(parsed.envelope.data.preferences).toEqual(defaultBackupPreferences);
  });

  it("enforces the byte limit before attempting JSON parsing", () => {
    expect(() =>
      parseBackupText("x".repeat(MAX_BACKUP_FILE_BYTES + 1)),
    ).toThrow(/larger than/i);
  });

  it("reports malformed JSON and complete-envelope validation errors", () => {
    expect(() => parseBackupText("not-json")).toThrow(/valid JSON/i);
    expect(() => parseBackupText(JSON.stringify({ app: "web-band" }))).toThrow(
      /valid Web Band backup/i,
    );
  });
});
