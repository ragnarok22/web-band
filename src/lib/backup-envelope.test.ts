import { describe, expect, it } from "vitest";

import { basicPopPattern } from "@/data/strumming-patterns";
import { defaultPracticeSettings } from "@/db/repositories/settings-repository";
import {
  createBackupEnvelope,
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
  it("creates a detached, canonical version 1 envelope", () => {
    const snapshot = structuredClone(emptySnapshot);
    const backupSettings = settings();
    const envelope = createBackupEnvelope(
      snapshot,
      backupSettings,
      new Date("2026-07-18T12:34:56.789Z"),
    );

    expect(envelope).toMatchObject({
      app: "web-band",
      exportedAt: "2026-07-18T12:34:56.789Z",
      version: 1,
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
