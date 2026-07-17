import { afterEach, describe, expect, it } from "vitest";

import { WebBandDatabase } from "@/db/database";
import { DexieFavoriteRepository } from "@/db/repositories/favorite-repository";

let database: WebBandDatabase | null = null;

afterEach(async () => {
  await database?.delete();
  database = null;
});

describe("favorite repository", () => {
  it("persists and removes favorite pattern IDs", async () => {
    database = new WebBandDatabase(`web-band-test-${crypto.randomUUID()}`);
    await database.open();
    const repository = new DexieFavoriteRepository(database.favoritePatterns);

    await repository.add("basic-rock");
    await repository.add("one-drop");
    expect(new Set(await repository.list())).toEqual(
      new Set(["one-drop", "basic-rock"]),
    );

    await repository.remove("basic-rock");
    expect(await repository.list()).toEqual(["one-drop"]);
  });
});
