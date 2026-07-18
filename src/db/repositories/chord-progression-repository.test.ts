import { afterEach, describe, expect, it } from "vitest";

import { gDEmCProgression } from "@/data/chord-progressions";
import { WebBandDatabase } from "@/db/database";
import {
  DexieChordProgressionRepository,
  MemoryChordProgressionRepository,
} from "@/db/repositories/chord-progression-repository";
import type { CustomChordProgression } from "@/types/persistence";

let database: WebBandDatabase | null = null;

afterEach(async () => {
  await database?.delete();
  database = null;
});

function createProgression(
  id: string,
  updatedAt = "2026-07-18T12:00:00.000Z",
): CustomChordProgression {
  return {
    ...structuredClone(gDEmCProgression),
    createdAt: "2026-07-18T10:00:00.000Z",
    id,
    isBuiltIn: false,
    name: id,
    updatedAt,
  };
}

describe("chord progression repositories", () => {
  it("stores, sorts, filters, and deletes Dexie rows", async () => {
    database = new WebBandDatabase(`web-band-test-${crypto.randomUUID()}`);
    await database.open();
    const repository = new DexieChordProgressionRepository(
      database.chordProgressions,
    );
    const older = createProgression("older", "2026-07-18T11:00:00.000Z");
    const newerB = createProgression("newer-b");
    const newerA = createProgression("newer-a");

    await Promise.all([
      repository.put(older),
      repository.put(newerB),
      repository.put(newerA),
    ]);
    await database.chordProgressions.put({
      ...createProgression("corrupt"),
      steps: [],
    });
    await database.chordProgressions.put({
      ...createProgression("offset-timestamp"),
      createdAt: "2026-07-18T12:00:00.000+02:00",
    });

    expect((await repository.list()).map(({ id }) => id)).toEqual([
      "newer-a",
      "newer-b",
      "older",
    ]);
    expect(await repository.get("corrupt")).toBeUndefined();
    expect(await repository.get("offset-timestamp")).toBeUndefined();
    expect(await repository.get("older")).toEqual(older);

    await repository.delete("older");
    expect(await repository.get("older")).toBeUndefined();
  });

  it("rejects invalid writes and deep-clones memory values", async () => {
    const repository = new MemoryChordProgressionRepository();
    const progression = createProgression("memory");

    await repository.put(progression);
    progression.steps[0]!.chord = "mutated input";
    const firstRead = await repository.get("memory");
    expect(firstRead?.steps[0]?.chord).toBe("G");
    firstRead!.steps[0]!.chord = "mutated read";
    expect((await repository.get("memory"))?.steps[0]?.chord).toBe("G");

    await expect(
      repository.put(gDEmCProgression as CustomChordProgression),
    ).rejects.toThrow("Only valid custom chord progressions can be saved.");
    await expect(
      repository.put(createProgression(gDEmCProgression.id)),
    ).rejects.toThrow("Only valid custom chord progressions can be saved.");
  });
});
