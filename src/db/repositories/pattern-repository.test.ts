import { afterEach, describe, expect, it } from "vitest";

import { basicRockPattern } from "@/data/patterns/rock";
import { WebBandDatabase } from "@/db/database";
import {
  DexiePatternRepository,
  MemoryPatternRepository,
} from "@/db/repositories/pattern-repository";
import type { CustomDrumPattern } from "@/types/persistence";

let database: WebBandDatabase | null = null;

afterEach(async () => {
  await database?.delete();
  database = null;
});

function createCustomPattern(
  id = "my-rock-pattern",
  updatedAt = "2026-07-18T12:00:00.000Z",
): CustomDrumPattern {
  return {
    ...structuredClone(basicRockPattern),
    category: "custom",
    createdAt: "2026-07-18T10:00:00.000Z",
    id,
    isBuiltIn: false,
    name: id,
    updatedAt,
  };
}

describe("Dexie pattern repository", () => {
  it("stores, reads, lists, and deletes validated custom patterns", async () => {
    database = new WebBandDatabase(`web-band-test-${crypto.randomUUID()}`);
    await database.open();
    const repository = new DexiePatternRepository(database.customPatterns);
    const older = createCustomPattern("older", "2026-07-18T11:00:00.000Z");
    const newerB = createCustomPattern("newer-b");
    const newerA = createCustomPattern("newer-a");

    await repository.put(older);
    await repository.put(newerB);
    await repository.put(newerA);
    await database.customPatterns.put({
      ...createCustomPattern("corrupt"),
      createdAt: "not-a-date",
    } as CustomDrumPattern);
    expect((await repository.list()).map(({ id }) => id)).toEqual([
      "newer-a",
      "newer-b",
      "older",
    ]);
    expect(await repository.get("corrupt")).toBeUndefined();
    expect(await repository.get(older.id)).toEqual(older);

    await repository.delete(older.id);
    expect(await repository.get(older.id)).toBeUndefined();
  });

  it("rejects built-in records, built-in ID collisions, and invalid IDs", async () => {
    database = new WebBandDatabase(`web-band-test-${crypto.randomUUID()}`);
    await database.open();
    const repository = new DexiePatternRepository(database.customPatterns);

    await expect(
      repository.put(basicRockPattern as CustomDrumPattern),
    ).rejects.toThrow("Only valid custom patterns can be saved.");
    await expect(
      repository.put(createCustomPattern(basicRockPattern.id)),
    ).rejects.toThrow("Only valid custom patterns can be saved.");
    await expect(repository.get(" ")).rejects.toThrow("Pattern ID is invalid.");
    await expect(repository.delete("x".repeat(129))).rejects.toThrow(
      "Pattern ID is invalid.",
    );
  });

  it("deep-clones patterns returned from memory", async () => {
    const repository = new MemoryPatternRepository();
    const pattern = createCustomPattern();

    await repository.put(pattern);
    const firstRead = await repository.get(pattern.id);
    firstRead!.hits[0]!.velocity = 0;
    expect((await repository.get(pattern.id))?.hits[0]?.velocity).toBe(
      pattern.hits[0]?.velocity,
    );

    const firstList = await repository.list();
    firstList[0]!.recommendedBpmRange.min = 200;
    expect((await repository.list())[0]?.recommendedBpmRange.min).toBe(
      pattern.recommendedBpmRange.min,
    );
  });
});
