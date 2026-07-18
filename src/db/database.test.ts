import Dexie from "dexie";
import { afterEach, describe, expect, it } from "vitest";

import { gDEmCProgression } from "@/data/chord-progressions";
import { WebBandDatabase } from "@/db/database";
import type {
  CustomChordProgression,
  PracticePreset,
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

    expect(migrated.verno).toBe(2);
    expect(await migrated.chordProgressions.get(progression.id)).toEqual(
      progression,
    );
    expect(await migrated.practicePresets.get(preset.id)).toEqual(preset);
    expect(await migrated.favoriteChordProgressions.toArray()).toEqual([]);
    migrated.close();
  });
});
