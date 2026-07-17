import { afterEach, describe, expect, it } from "vitest";

import { basicRockPattern } from "@/data/patterns/rock";
import { WebBandDatabase } from "@/db/database";
import { DexiePatternRepository } from "@/db/repositories/pattern-repository";
import type { DrumPattern } from "@/types/pattern";

let database: WebBandDatabase | null = null;

afterEach(async () => {
  await database?.delete();
  database = null;
});

function createCustomPattern(): DrumPattern {
  const timestamp = new Date().toISOString();
  return {
    ...structuredClone(basicRockPattern),
    category: "custom",
    createdAt: timestamp,
    id: "my-rock-pattern",
    isBuiltIn: false,
    name: "My Rock Pattern",
    updatedAt: timestamp,
  };
}

describe("Dexie pattern repository", () => {
  it("stores, reads, lists, and deletes validated custom patterns", async () => {
    database = new WebBandDatabase(`web-band-test-${crypto.randomUUID()}`);
    await database.open();
    const repository = new DexiePatternRepository(database.customPatterns);
    const pattern = createCustomPattern();

    await repository.put(pattern);
    expect(await repository.get(pattern.id)).toEqual(pattern);
    expect(await repository.list()).toEqual([pattern]);

    await repository.delete(pattern.id);
    expect(await repository.get(pattern.id)).toBeUndefined();
  });

  it("does not allow built-in patterns to be written", async () => {
    database = new WebBandDatabase(`web-band-test-${crypto.randomUUID()}`);
    await database.open();
    const repository = new DexiePatternRepository(database.customPatterns);

    await expect(repository.put(basicRockPattern)).rejects.toThrow(
      "Only valid custom patterns can be saved.",
    );
  });
});
