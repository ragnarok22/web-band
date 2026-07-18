import { afterEach, describe, expect, it } from "vitest";

import { WebBandDatabase } from "@/db/database";
import {
  DexiePracticeSessionRepository,
  MemoryPracticeSessionRepository,
} from "@/db/repositories/practice-session-repository";
import type { PracticeSession } from "@/types/persistence";

let database: WebBandDatabase | null = null;

afterEach(async () => {
  await database?.delete();
  database = null;
});

function createSession(
  id: string,
  startedAt = "2026-07-18T12:00:00.000Z",
): PracticeSession {
  const endedAt = new Date(Date.parse(startedAt) + 60_000).toISOString();
  return {
    category: "rock",
    createdAt: startedAt,
    durationSeconds: 60,
    endedAt,
    endingBpm: 100,
    id,
    patternId: "basic-rock",
    patternName: "Basic Rock",
    practiceMode: "drums",
    startedAt,
    startingBpm: 90,
    timeSignature: "4/4",
    updatedAt: endedAt,
  };
}

describe("practice session repositories", () => {
  it("stores, sorts, filters, deletes, and clears Dexie sessions", async () => {
    database = new WebBandDatabase(`web-band-test-${crypto.randomUUID()}`);
    await database.open();
    const repository = new DexiePracticeSessionRepository(
      database.practiceSessions,
    );
    const older = createSession("older", "2026-07-18T10:00:00.000Z");
    const newerB = createSession("newer-b");
    const newerA = createSession("newer-a");

    await repository.put(older);
    await repository.put(newerB);
    await repository.put(newerA);
    await database.practiceSessions.put({
      ...createSession("corrupt"),
      durationSeconds: 0,
    });

    expect((await repository.list()).map(({ id }) => id)).toEqual([
      "newer-a",
      "newer-b",
      "older",
    ]);
    await repository.delete("older");
    expect((await repository.list()).map(({ id }) => id)).toEqual([
      "newer-a",
      "newer-b",
    ]);
    await expect(repository.delete(" ")).rejects.toThrow(
      "Practice session ID is invalid.",
    );

    await repository.clear();
    expect(await repository.list()).toEqual([]);
  });

  it("validates writes and deep-clones memory sessions", async () => {
    const repository = new MemoryPracticeSessionRepository();
    const session = createSession("memory");

    await repository.put(session);
    session.patternName = "Mutated input";
    const firstList = await repository.list();
    expect(firstList[0]?.patternName).toBe("Basic Rock");
    firstList[0]!.patternName = "Mutated read";
    expect((await repository.list())[0]?.patternName).toBe("Basic Rock");

    await expect(
      repository.put({ ...createSession("invalid"), endedAt: "invalid" }),
    ).rejects.toThrow("Only valid practice sessions can be saved.");
    await repository.clear();
    expect(await repository.list()).toEqual([]);
  });
});
