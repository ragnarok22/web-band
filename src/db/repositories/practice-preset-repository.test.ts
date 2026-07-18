import { afterEach, describe, expect, it } from "vitest";

import { WebBandDatabase } from "@/db/database";
import {
  DexiePracticePresetRepository,
  MemoryPracticePresetRepository,
} from "@/db/repositories/practice-preset-repository";
import type { PracticePreset } from "@/types/persistence";

let database: WebBandDatabase | null = null;

afterEach(async () => {
  await database?.delete();
  database = null;
});

function createPreset(
  id: string,
  updatedAt = "2026-07-18T12:00:00.000Z",
): PracticePreset {
  return {
    configuration: {
      bpm: 90,
      countInMeasures: 1,
      fillFrequency: null,
      guidedPractice: { mode: "drums" },
      humanization: 0,
      patternId: "basic-rock",
      swing: 0,
    },
    createdAt: "2026-07-18T10:00:00.000Z",
    id,
    isFavorite: false,
    lastUsedAt: null,
    name: id,
    updatedAt,
  };
}

describe("practice preset repositories", () => {
  it("stores, sorts, filters, and deletes Dexie rows", async () => {
    database = new WebBandDatabase(`web-band-test-${crypto.randomUUID()}`);
    await database.open();
    const repository = new DexiePracticePresetRepository(
      database.practicePresets,
    );
    const older = createPreset("older", "2026-07-18T11:00:00.000Z");
    const newerB = createPreset("newer-b");
    const newerA = createPreset("newer-a");

    await Promise.all([
      repository.put(older),
      repository.put(newerB),
      repository.put(newerA),
    ]);
    await database.practicePresets.put({
      ...createPreset("corrupt"),
      configuration: {
        ...createPreset("corrupt").configuration,
        bpm: 500,
      },
    });
    await database.practicePresets.put({
      ...createPreset("noncanonical-timestamp"),
      updatedAt: "2026-07-18T12:00:00Z",
    });

    expect((await repository.list()).map(({ id }) => id)).toEqual([
      "newer-a",
      "newer-b",
      "older",
    ]);
    expect(await repository.get("corrupt")).toBeUndefined();
    expect(await repository.get("noncanonical-timestamp")).toBeUndefined();
    await repository.delete("older");
    expect(await repository.get("older")).toBeUndefined();
  });

  it("validates and deep-clones memory values", async () => {
    const repository = new MemoryPracticePresetRepository();
    const preset = createPreset("memory");

    await repository.put(preset);
    preset.configuration.bpm = 120;
    const firstRead = await repository.get("memory");
    expect(firstRead?.configuration.bpm).toBe(90);
    firstRead!.configuration.bpm = 140;
    expect((await repository.get("memory"))?.configuration.bpm).toBe(90);

    await expect(
      repository.put({ ...createPreset("invalid"), name: "" }),
    ).rejects.toThrow("Only valid practice presets can be saved.");
  });
});
