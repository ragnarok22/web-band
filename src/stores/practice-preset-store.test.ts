import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { defaultPracticeSettings } from "@/db/repositories/settings-repository";
import { storageService } from "@/db/storage-service";
import {
  createDefaultGuidedPracticeValues,
  useGuidedPracticeStore,
} from "@/stores/guided-practice-store";
import { usePracticePresetStore } from "@/stores/practice-preset-store";
import { usePracticeStore } from "@/stores/practice-store";

beforeEach(async () => {
  storageService.close();
  vi.stubGlobal("indexedDB", undefined);
  vi.useFakeTimers();
  vi.setSystemTime("2026-07-18T12:00:00.000Z");
  usePracticeStore.setState({
    ...structuredClone(defaultPracticeSettings),
    bpm: 104,
    countInMeasures: 2,
    fillFrequency: 8,
    humanization: 0.15,
    selectedPatternId: "one-drop",
    swing: 0.3,
  });
  useGuidedPracticeStore.setState({
    ...createDefaultGuidedPracticeValues(),
    mode: "chords",
  });
  usePracticePresetStore.setState({
    isHydrated: false,
    presets: [],
    recentPresetIds: [],
  });
  await storageService.initialize();
});

afterEach(() => {
  vi.useRealTimers();
  storageService.close();
  vi.unstubAllGlobals();
});

describe("practice preset store", () => {
  it("manages complete current snapshots and recent presets", async () => {
    const created = await usePracticePresetStore
      .getState()
      .createSnapshot("Guitar warm-up");
    expect(created.configuration).toMatchObject({
      bpm: 104,
      countInMeasures: 2,
      fillFrequency: 8,
      guidedPractice: { mode: "chords" },
      humanization: 0.15,
      patternId: "one-drop",
      swing: 0.3,
    });

    const renamed = await usePracticePresetStore
      .getState()
      .rename(created.id, "Evening warm-up");
    expect(renamed.name).toBe("Evening warm-up");

    usePracticeStore.setState({ bpm: 132, selectedPatternId: "basic-rock" });
    const updated = await usePracticePresetStore.getState().update(created.id);
    expect(updated.configuration.bpm).toBe(132);
    expect(updated.configuration.patternId).toBe("basic-rock");

    const duplicate = await usePracticePresetStore
      .getState()
      .duplicate(created.id);
    expect(duplicate.id).not.toBe(created.id);
    expect(duplicate.name).toBe("Evening warm-up copy");
    expect(duplicate.configuration).toEqual(updated.configuration);

    await usePracticePresetStore.getState().toggleFavorite(created.id);
    expect(
      usePracticePresetStore
        .getState()
        .presets.find(({ id }) => id === created.id)?.isFavorite,
    ).toBe(true);

    vi.setSystemTime("2026-07-18T12:05:00.000Z");
    await usePracticePresetStore.getState().markUsed(created.id);
    expect(usePracticePresetStore.getState().recentPresetIds[0]).toBe(
      created.id,
    );

    usePracticePresetStore.setState({
      isHydrated: false,
      presets: [],
      recentPresetIds: [],
    });
    await usePracticePresetStore.getState().hydrate();
    expect(usePracticePresetStore.getState().presets).toHaveLength(2);
    expect(usePracticePresetStore.getState().recentPresetIds).toEqual([
      created.id,
    ]);

    await usePracticePresetStore.getState().delete(duplicate.id);
    expect(usePracticePresetStore.getState().presets).toHaveLength(1);
  });

  it("rejects invalid names and missing preset operations", async () => {
    await expect(
      usePracticePresetStore.getState().createSnapshot(""),
    ).rejects.toThrow("Only valid practice presets can be saved.");
    await expect(
      usePracticePresetStore.getState().rename("missing", "Name"),
    ).rejects.toThrow("Practice preset was not found.");
    expect(usePracticePresetStore.getState().presets).toEqual([]);
  });

  it("marks a preset used without reordering presets by edit time", async () => {
    const older = await usePracticePresetStore
      .getState()
      .createSnapshot("Older preset");
    vi.setSystemTime("2026-07-18T12:01:00.000Z");
    const newer = await usePracticePresetStore
      .getState()
      .createSnapshot("Newer preset");
    vi.setSystemTime("2026-07-18T12:02:00.000Z");

    await usePracticePresetStore.getState().markUsed(older.id);

    const state = usePracticePresetStore.getState();
    expect(state.presets.map(({ id }) => id)).toEqual([newer.id, older.id]);
    expect(state.presets.find(({ id }) => id === older.id)?.updatedAt).toBe(
      older.updatedAt,
    );
    expect(state.recentPresetIds[0]).toBe(older.id);
  });
});
