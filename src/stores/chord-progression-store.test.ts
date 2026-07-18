import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { gDEmCProgression } from "@/data/chord-progressions";
import { storageService } from "@/db/storage-service";
import { useChordProgressionStore } from "@/stores/chord-progression-store";

beforeEach(async () => {
  storageService.close();
  vi.stubGlobal("indexedDB", undefined);
  useChordProgressionStore.setState({
    customProgressions: [],
    favoriteProgressionIds: [],
    isHydrated: false,
  });
  await storageService.initialize();
});

afterEach(() => {
  storageService.close();
  vi.unstubAllGlobals();
});

describe("chord progression store", () => {
  it("creates, updates, hydrates, favorites, copies, and deletes", async () => {
    const input = {
      name: "My progression",
      steps: structuredClone(gDEmCProgression.steps),
    };
    const created = await useChordProgressionStore.getState().create(input);
    input.steps[0]!.chord = "mutated input";
    expect(created.isBuiltIn).toBe(false);
    expect(
      useChordProgressionStore.getState().customProgressions[0]?.steps[0]
        ?.chord,
    ).toBe("G");

    const updated = await useChordProgressionStore
      .getState()
      .update(created.id, { name: "Renamed progression" });
    expect(updated.name).toBe("Renamed progression");

    await useChordProgressionStore.getState().toggleFavorite(created.id);
    expect(
      useChordProgressionStore.getState().favoriteProgressionIds,
    ).toContain(created.id);

    const copied = await useChordProgressionStore
      .getState()
      .copyBuiltIn(gDEmCProgression.id);
    expect(copied.name).toBe(`${gDEmCProgression.name} copy`);
    expect(copied.steps.map(({ id }) => id)).not.toEqual(
      gDEmCProgression.steps.map(({ id }) => id),
    );

    useChordProgressionStore.setState({
      customProgressions: [],
      favoriteProgressionIds: [],
      isHydrated: false,
    });
    await useChordProgressionStore.getState().hydrate();
    expect(useChordProgressionStore.getState().customProgressions).toHaveLength(
      2,
    );
    expect(useChordProgressionStore.getState().isHydrated).toBe(true);

    await useChordProgressionStore.getState().delete(created.id);
    expect(
      useChordProgressionStore
        .getState()
        .customProgressions.map(({ id }) => id),
    ).not.toContain(created.id);
    expect(
      useChordProgressionStore.getState().favoriteProgressionIds,
    ).not.toContain(created.id);
  });

  it("rejects invalid progression writes without changing state", async () => {
    await expect(
      useChordProgressionStore.getState().create({ name: "", steps: [] }),
    ).rejects.toThrow("Only valid custom chord progressions can be saved.");
    expect(useChordProgressionStore.getState().customProgressions).toEqual([]);
  });

  it("keeps store state intact when atomic deletion fails", async () => {
    const created = await useChordProgressionStore.getState().create({
      name: "Favorite progression",
      steps: structuredClone(gDEmCProgression.steps),
    });
    await useChordProgressionStore.getState().toggleFavorite(created.id);
    vi.spyOn(
      storageService,
      "deleteCustomChordProgression",
    ).mockRejectedValueOnce(new Error("transaction failed"));

    await expect(
      useChordProgressionStore.getState().delete(created.id),
    ).rejects.toThrow("transaction failed");
    expect(
      useChordProgressionStore
        .getState()
        .customProgressions.map(({ id }) => id),
    ).toContain(created.id);
    expect(
      useChordProgressionStore.getState().favoriteProgressionIds,
    ).toContain(created.id);
  });
});
