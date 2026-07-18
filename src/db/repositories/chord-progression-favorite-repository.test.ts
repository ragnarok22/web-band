import { afterEach, describe, expect, it } from "vitest";

import { WebBandDatabase } from "@/db/database";
import {
  DexieChordProgressionFavoriteRepository,
  MemoryChordProgressionFavoriteRepository,
} from "@/db/repositories/chord-progression-favorite-repository";

let database: WebBandDatabase | null = null;

afterEach(async () => {
  await database?.delete();
  database = null;
});

describe("chord progression favorite repositories", () => {
  it("stores deterministic favorite IDs and filters corrupt Dexie rows", async () => {
    database = new WebBandDatabase(`web-band-test-${crypto.randomUUID()}`);
    await database.open();
    const repository = new DexieChordProgressionFavoriteRepository(
      database.favoriteChordProgressions,
    );

    await repository.add("progression-b");
    await repository.add("progression-a");
    await database.favoriteChordProgressions.put({
      createdAt: "invalid",
      progressionId: "corrupt",
    });
    await database.favoriteChordProgressions.put({
      createdAt: "2026-07-18T14:00:00.000+02:00",
      progressionId: "offset-timestamp",
    });
    await database.favoriteChordProgressions.put({
      createdAt: "2026-07-18T12:00:00Z",
      progressionId: "noncanonical-timestamp",
    });

    expect(await repository.list()).toEqual(["progression-a", "progression-b"]);
    await repository.remove("progression-a");
    expect(await repository.list()).toEqual(["progression-b"]);
  });

  it("validates IDs and keeps deterministic memory order", async () => {
    const repository = new MemoryChordProgressionFavoriteRepository();

    await repository.add("b");
    await repository.add("a");
    expect(await repository.list()).toEqual(["a", "b"]);
    await expect(repository.add(" ")).rejects.toThrow(
      "Chord progression ID is invalid.",
    );
  });
});
