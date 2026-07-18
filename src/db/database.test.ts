import Dexie from "dexie";
import { afterEach, describe, expect, it } from "vitest";

import { gDEmCProgression } from "@/data/chord-progressions";
import { basicPopPattern } from "@/data/strumming-patterns";
import { WebBandDatabase } from "@/db/database";
import type {
  CustomChordProgression,
  CustomStrummingPattern,
  PracticePreset,
  PracticeSession,
} from "@/types/persistence";

let databaseName: string | null = null;

afterEach(async () => {
  if (databaseName) await Dexie.delete(databaseName);
  databaseName = null;
});

describe("WebBandDatabase migrations", () => {
  it("adds chord favorites in version 2 without losing version 1 data", async () => {
    databaseName = `web-band-migration-${crypto.randomUUID()}`;
    const timestamp = "2026-07-18T12:00:00.000Z";
    const progression: CustomChordProgression = {
      ...structuredClone(gDEmCProgression),
      createdAt: timestamp,
      id: "v1-progression",
      isBuiltIn: false,
      updatedAt: timestamp,
    };
    const preset: PracticePreset = {
      configuration: {
        bpm: 90,
        countInMeasures: 1,
        fillFrequency: null,
        guidedPractice: { mode: "drums" },
        humanization: 0,
        patternId: "basic-rock",
        swing: 0,
      },
      createdAt: timestamp,
      id: "v1-preset",
      isFavorite: false,
      lastUsedAt: null,
      name: "Version one preset",
      updatedAt: timestamp,
    };
    const versionOne = new Dexie(databaseName);
    versionOne.version(1).stores({
      chordProgressions: "id, updatedAt",
      customPatterns: "id, category, difficulty, updatedAt",
      favoritePatterns: "patternId, createdAt",
      practicePresets: "id, updatedAt",
      practiceSessions: "id, createdAt, updatedAt",
      strummingPatterns: "id, updatedAt",
    });
    await versionOne.open();
    await versionOne
      .table<CustomChordProgression, string>("chordProgressions")
      .put(progression);
    await versionOne
      .table<PracticePreset, string>("practicePresets")
      .put(preset);
    versionOne.close();

    const migrated = new WebBandDatabase(databaseName);
    await migrated.open();

    expect(migrated.verno).toBe(3);
    expect(await migrated.chordProgressions.get(progression.id)).toEqual(
      progression,
    );
    expect(await migrated.practicePresets.get(preset.id)).toEqual(preset);
    expect(await migrated.favoriteChordProgressions.toArray()).toEqual([]);
    migrated.close();
  });

  it("retains version 2 session and strumming rows while adding version 3 indexes", async () => {
    databaseName = `web-band-v3-migration-${crypto.randomUUID()}`;
    const timestamp = "2026-07-18T12:00:00.000Z";
    const session: PracticeSession = {
      category: "rock",
      createdAt: timestamp,
      durationSeconds: 120,
      endedAt: "2026-07-18T12:02:00.000Z",
      endingBpm: 100,
      id: "v2-session",
      patternId: "basic-rock",
      patternName: "Basic Rock",
      practiceMode: "drums",
      startedAt: timestamp,
      startingBpm: 90,
      timeSignature: "4/4",
      updatedAt: timestamp,
    };
    const strummingPattern: CustomStrummingPattern = {
      ...structuredClone(basicPopPattern),
      createdAt: timestamp,
      id: "v2-strumming",
      isBuiltIn: false,
      name: "Version two strumming",
      updatedAt: timestamp,
    };
    const corruptLegacySession = {
      createdAt: timestamp,
      data: { duration: "unknown" },
      id: "legacy-corrupt-session",
      updatedAt: timestamp,
    };
    const versionTwo = new Dexie(databaseName);
    versionTwo.version(1).stores({
      chordProgressions: "id, updatedAt",
      customPatterns: "id, category, difficulty, updatedAt",
      favoritePatterns: "patternId, createdAt",
      practicePresets: "id, updatedAt",
      practiceSessions: "id, createdAt, updatedAt",
      strummingPatterns: "id, updatedAt",
    });
    versionTwo.version(2).stores({
      chordProgressions: "id, updatedAt",
      customPatterns: "id, category, difficulty, updatedAt",
      favoriteChordProgressions: "progressionId, createdAt",
      favoritePatterns: "patternId, createdAt",
      practicePresets: "id, updatedAt",
      practiceSessions: "id, createdAt, updatedAt",
      strummingPatterns: "id, updatedAt",
    });
    await versionTwo.open();
    await versionTwo
      .table("practiceSessions")
      .bulkPut([session, corruptLegacySession]);
    await versionTwo.table("strummingPatterns").put(strummingPattern);
    versionTwo.close();

    const migrated = new WebBandDatabase(databaseName);
    await migrated.open();

    expect(migrated.verno).toBe(3);
    expect(await migrated.practiceSessions.get(session.id)).toEqual(session);
    expect(
      await migrated.table("practiceSessions").get(corruptLegacySession.id),
    ).toEqual(corruptLegacySession);
    expect(await migrated.strummingPatterns.get(strummingPattern.id)).toEqual(
      strummingPattern,
    );
    expect(
      migrated.practiceSessions.schema.indexes.map(({ name }) => name),
    ).toEqual(
      expect.arrayContaining(["startedAt", "patternId", "practiceMode"]),
    );
    migrated.close();
  });
});
