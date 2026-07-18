import { afterEach, describe, expect, it } from "vitest";

import { basicPopPattern } from "@/data/strumming-patterns";
import { WebBandDatabase } from "@/db/database";
import {
  DexieStrummingPatternRepository,
  MemoryStrummingPatternRepository,
} from "@/db/repositories/strumming-pattern-repository";
import type { CustomStrummingPattern } from "@/types/persistence";

let database: WebBandDatabase | null = null;

afterEach(async () => {
  await database?.delete();
  database = null;
});

function createPattern(
  id: string,
  updatedAt = "2026-07-18T12:00:00.000Z",
): CustomStrummingPattern {
  return {
    ...structuredClone(basicPopPattern),
    createdAt: "2026-07-18T10:00:00.000Z",
    id,
    isBuiltIn: false,
    name: id,
    updatedAt,
  };
}

describe("custom strumming pattern repositories", () => {
  it("stores, sorts, filters, reads, and deletes Dexie patterns", async () => {
    database = new WebBandDatabase(`web-band-test-${crypto.randomUUID()}`);
    await database.open();
    const repository = new DexieStrummingPatternRepository(
      database.strummingPatterns,
    );
    const older = createPattern("older", "2026-07-18T11:00:00.000Z");
    const newerB = createPattern("newer-b");
    const newerA = createPattern("newer-a");

    await repository.put(older);
    await repository.put(newerB);
    await repository.put(newerA);
    await database.strummingPatterns.put({
      ...createPattern("corrupt"),
      updatedAt: "not-a-date",
    });

    expect((await repository.list()).map(({ id }) => id)).toEqual([
      "newer-a",
      "newer-b",
      "older",
    ]);
    expect(await repository.get("corrupt")).toBeUndefined();
    expect(await repository.get("older")).toEqual(older);
    await repository.delete("older");
    expect(await repository.get("older")).toBeUndefined();
    await expect(repository.get(" ")).rejects.toThrow(
      "Strumming pattern ID is invalid.",
    );
  });

  it("rejects collisions and deep-clones memory values", async () => {
    const repository = new MemoryStrummingPatternRepository();
    const pattern = createPattern("memory");

    await repository.put(pattern);
    pattern.steps[0]!.action = "up";
    const firstRead = await repository.get("memory");
    expect(firstRead?.steps[0]?.action).toBe(basicPopPattern.steps[0]?.action);
    firstRead!.steps[0]!.action = "mute";
    expect((await repository.get("memory"))?.steps[0]?.action).toBe(
      basicPopPattern.steps[0]?.action,
    );

    await expect(
      repository.put(createPattern(basicPopPattern.id)),
    ).rejects.toThrow("Only valid custom strumming patterns can be saved.");
  });
});
