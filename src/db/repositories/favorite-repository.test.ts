import { afterEach, describe, expect, it, vi } from "vitest";

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
    const reportCorruptRows = vi.fn();
    const repository = new DexieFavoriteRepository(
      database.favoritePatterns,
      reportCorruptRows,
    );

    await repository.add("basic-rock");
    await repository.add("one-drop");
    await database.favoritePatterns.put({
      createdAt: "2026-07-18T14:00:00.000+02:00",
      patternId: "offset-timestamp",
    });
    await database.favoritePatterns.put({
      createdAt: "2026-07-18T12:00:00Z",
      patternId: "noncanonical-timestamp",
    });
    expect(new Set(await repository.list())).toEqual(
      new Set(["one-drop", "basic-rock"]),
    );
    expect(reportCorruptRows).toHaveBeenLastCalledWith(2);

    await repository.remove("basic-rock");
    expect(await repository.list()).toEqual(["one-drop"]);
    expect(reportCorruptRows.mock.calls).toEqual([[2], [2]]);
    await expect(repository.add("x".repeat(129))).rejects.toThrow(
      "Pattern ID is invalid.",
    );
  });
});
