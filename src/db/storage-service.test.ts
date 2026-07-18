import { afterEach, describe, expect, it, vi } from "vitest";

import { gDEmCProgression } from "@/data/chord-progressions";
import { StorageService } from "@/db/storage-service";
import type {
  CustomChordProgression,
  PracticePreset,
} from "@/types/persistence";

const timestamp = "2026-07-18T12:00:00.000Z";

function createProgression(): CustomChordProgression {
  return {
    ...structuredClone(gDEmCProgression),
    createdAt: timestamp,
    id: "custom-chords",
    isBuiltIn: false,
    updatedAt: timestamp,
  };
}

function createPreset(): PracticePreset {
  return {
    configuration: {
      bpm: 90,
      countInMeasures: 1,
      fillFrequency: null,
      guidedPractice: { mode: "drums" },
      humanization: 0,
      patternId: "basic-rock",
      swing: 0,
    },
    createdAt: timestamp,
    id: "preset",
    isFavorite: false,
    lastUsedAt: null,
    name: "Preset",
    updatedAt: timestamp,
  };
}

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("storage service", () => {
  it("initializes the versioned IndexedDB database", async () => {
    const service = new StorageService();
    const status = await service.initialize(
      `web-band-test-${crypto.randomUUID()}`,
    );

    expect(status).toEqual({ mode: "indexed-db", warning: null });
    await service.chordProgressionRepository.put(createProgression());
    await service.chordProgressionFavoriteRepository.add("custom-chords");
    await service.practicePresetRepository.put(createPreset());
    expect(await service.chordProgressionRepository.list()).toHaveLength(1);
    expect(await service.chordProgressionFavoriteRepository.list()).toEqual([
      "custom-chords",
    ]);
    expect(await service.practicePresetRepository.list()).toHaveLength(1);

    await service.deleteCustomChordProgression("custom-chords");
    expect(await service.chordProgressionRepository.list()).toEqual([]);
    expect(await service.chordProgressionFavoriteRepository.list()).toEqual([]);
    service.close();
  });

  it("rolls back both chord records when atomic deletion fails", async () => {
    const service = new StorageService();
    await service.initialize(`web-band-test-${crypto.randomUUID()}`);
    const progression = createProgression();
    await service.chordProgressionRepository.put(progression);
    await service.chordProgressionFavoriteRepository.add(progression.id);
    vi.spyOn(
      service.chordProgressionFavoriteRepository,
      "remove",
    ).mockRejectedValueOnce(new Error("favorite delete failed"));

    await expect(
      service.deleteCustomChordProgression(progression.id),
    ).rejects.toThrow("favorite delete failed");
    expect(
      await service.chordProgressionRepository.get(progression.id),
    ).toEqual(progression);
    expect(await service.chordProgressionFavoriteRepository.list()).toEqual([
      progression.id,
    ]);
    service.close();
  });

  it("recovers from a repository failure after opening IndexedDB", async () => {
    const service = new StorageService();
    expect(
      await service.initialize(`web-band-test-${crypto.randomUUID()}`),
    ).toEqual({ mode: "indexed-db", warning: null });
    const chordProgressions = service.chordProgressionRepository;
    const chordProgressionFavorites =
      service.chordProgressionFavoriteRepository;
    const practicePresets = service.practicePresetRepository;
    vi.spyOn(practicePresets, "list").mockRejectedValueOnce(
      new Error("repository read failed"),
    );

    await expect(practicePresets.list()).rejects.toThrow(
      "repository read failed",
    );
    const status = service.recoverFromRepositoryFailure();

    expect(status.mode).toBe("memory");
    expect(status.warning).toContain("Practice can continue");
    expect(service.currentStatus).toEqual(status);
    expect(service.chordProgressionRepository).not.toBe(chordProgressions);
    expect(service.chordProgressionFavoriteRepository).not.toBe(
      chordProgressionFavorites,
    );
    expect(service.practicePresetRepository).not.toBe(practicePresets);
    expect(await service.initialize()).toEqual(status);
    service.close();
  });

  it("falls back to memory when IndexedDB is unavailable", async () => {
    vi.stubGlobal("indexedDB", undefined);
    const service = new StorageService();
    const status = await service.initialize();

    expect(status.mode).toBe("memory");
    expect(status.warning).toContain("Practice can continue");
    await service.chordProgressionRepository.put(createProgression());
    await service.chordProgressionFavoriteRepository.add("custom-chords");
    await service.practicePresetRepository.put(createPreset());
    expect(await service.chordProgressionRepository.list()).toHaveLength(1);
    expect(await service.chordProgressionFavoriteRepository.list()).toEqual([
      "custom-chords",
    ]);
    expect(await service.practicePresetRepository.list()).toHaveLength(1);

    await service.deleteCustomChordProgression("custom-chords");
    expect(await service.chordProgressionRepository.list()).toEqual([]);
    expect(await service.chordProgressionFavoriteRepository.list()).toEqual([]);

    service.close();
    expect(await service.chordProgressionRepository.list()).toEqual([]);
    expect(await service.chordProgressionFavoriteRepository.list()).toEqual([]);
    expect(await service.practicePresetRepository.list()).toEqual([]);
  });
});
