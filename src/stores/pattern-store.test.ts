import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { basicRockPattern } from "@/data/patterns";
import { storageService } from "@/db/storage-service";
import { usePatternStore } from "@/stores/pattern-store";

beforeEach(async () => {
  storageService.close();
  vi.stubGlobal("indexedDB", undefined);
  usePatternStore.setState({
    customPatterns: [],
    favoritePatternIds: [],
    isHydrated: false,
    recentPatternIds: [],
  });
  await storageService.initialize();
});

afterEach(() => {
  storageService.close();
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

describe("pattern store", () => {
  it("creates, duplicates, updates, hydrates, and deletes custom patterns", async () => {
    const created = await usePatternStore.getState().create();
    expect(created).toMatchObject({
      isBuiltIn: false,
      name: "Untitled pattern",
    });
    expect(await storageService.patternRepository.get(created.id)).toEqual(
      created,
    );

    const updated = await usePatternStore.getState().update(created.id, {
      description: "A pocket of my own.",
      name: "My pocket",
    });
    expect(updated.name).toBe("My pocket");
    expect(updated.createdAt).toBe(created.createdAt);

    const builtInCopy = await usePatternStore
      .getState()
      .duplicate(basicRockPattern.id);
    const customCopy = await usePatternStore.getState().duplicate(updated.id);
    expect(builtInCopy.name).toBe("Basic Rock copy");
    expect(customCopy.name).toBe("My pocket copy");
    expect(customCopy.id).not.toBe(updated.id);
    expect(builtInCopy.hits.map(({ id }) => id)).not.toEqual(
      basicRockPattern.hits.map(({ id }) => id),
    );

    await usePatternStore.getState().toggleFavorite(updated.id);
    usePatternStore.setState({
      customPatterns: [],
      favoritePatternIds: [],
      isHydrated: false,
    });
    await usePatternStore.getState().hydrate();
    expect(usePatternStore.getState().customPatterns).toHaveLength(3);
    expect(usePatternStore.getState().favoritePatternIds).toContain(updated.id);

    await usePatternStore.getState().delete(updated.id);
    expect(
      await storageService.patternRepository.get(updated.id),
    ).toBeUndefined();
    expect(usePatternStore.getState().favoritePatternIds).not.toContain(
      updated.id,
    );
  });

  it("rejects built-in writes, deletes, and ID collisions", async () => {
    await expect(
      usePatternStore.getState().create({
        ...structuredClone(basicRockPattern),
        createdAt: "2026-07-18T12:00:00.000Z",
        isBuiltIn: false,
        updatedAt: "2026-07-18T12:00:00.000Z",
      }),
    ).rejects.toThrow("Pattern ID is already in use.");
    await expect(
      usePatternStore.getState().update(basicRockPattern.id, { name: "No" }),
    ).rejects.toThrow("Built-in patterns cannot be edited or deleted.");
    await expect(
      usePatternStore.getState().delete(basicRockPattern.id),
    ).rejects.toThrow("Built-in patterns cannot be edited or deleted.");
    expect(usePatternStore.getState().customPatterns).toEqual([]);
  });

  it("does not finalize deletion state when persistence fails", async () => {
    const created = await usePatternStore.getState().create();
    await usePatternStore.getState().toggleFavorite(created.id);
    vi.spyOn(storageService, "deleteCustomPattern").mockRejectedValueOnce(
      new Error("transaction failed"),
    );

    await expect(usePatternStore.getState().delete(created.id)).rejects.toThrow(
      "transaction failed",
    );
    expect(usePatternStore.getState().customPatterns).toContainEqual(created);
    expect(usePatternStore.getState().favoritePatternIds).toContain(created.id);
  });
});
