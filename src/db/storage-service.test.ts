import { afterEach, describe, expect, it, vi } from "vitest";

import { gDEmCProgression } from "@/data/chord-progressions";
import { basicRockPattern } from "@/data/patterns";
import { basicPopPattern } from "@/data/strumming-patterns";
import { WebBandDatabase } from "@/db/database";
import { StorageService } from "@/db/storage-service";
import type {
  CustomChordProgression,
  CustomDrumPattern,
  CustomStrummingPattern,
  PersistenceSnapshot,
  PracticePreset,
  PracticeSession,
} from "@/types/persistence";

const timestamp = "2026-07-18T12:00:00.000Z";

function createProgression(
  id = "custom-chords",
  name = "Custom Chords",
): CustomChordProgression {
  return {
    ...structuredClone(gDEmCProgression),
    createdAt: timestamp,
    id,
    isBuiltIn: false,
    name,
    updatedAt: timestamp,
  };
}

function createPreset(id = "preset", name = "Preset"): PracticePreset {
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
    id,
    isFavorite: false,
    lastUsedAt: null,
    name,
    updatedAt: timestamp,
  };
}

function createPattern(
  id = "custom-pattern",
  name = "Custom Pattern",
): CustomDrumPattern {
  return {
    ...structuredClone(basicRockPattern),
    createdAt: timestamp,
    id,
    isBuiltIn: false,
    name,
    updatedAt: timestamp,
  };
}

function createStrummingPattern(
  id = "custom-strumming",
  name = "Custom Strumming",
): CustomStrummingPattern {
  return {
    ...structuredClone(basicPopPattern),
    createdAt: timestamp,
    id,
    isBuiltIn: false,
    name,
    updatedAt: timestamp,
  };
}

function createSession(
  id = "session",
  patternName = "Custom Pattern",
): PracticeSession {
  return {
    category: "custom",
    createdAt: timestamp,
    durationSeconds: 60,
    endedAt: "2026-07-18T12:01:00.000Z",
    endingBpm: 100,
    id,
    patternId: "custom-pattern",
    patternName,
    practiceMode: "drums",
    startedAt: timestamp,
    startingBpm: 90,
    timeSignature: "4/4",
    updatedAt: "2026-07-18T12:01:00.000Z",
  };
}

function createSnapshot(prefix: string, label = prefix): PersistenceSnapshot {
  return {
    customChordProgressions: [
      createProgression(`${prefix}-chords`, `${label} Chords`),
    ],
    customPatterns: [createPattern(`${prefix}-pattern`, `${label} Pattern`)],
    customStrummingPatterns: [
      createStrummingPattern(`${prefix}-strumming`, `${label} Strumming`),
    ],
    favoriteChordProgressionIds: [`${prefix}-chords`],
    favoritePatternIds: [`${prefix}-pattern`],
    practicePresets: [createPreset(`${prefix}-preset`, `${label} Preset`)],
    practiceSessions: [createSession(`${prefix}-session`, `${label} Pattern`)],
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
    await service.patternRepository.put(createPattern());
    await service.favoriteRepository.add("custom-pattern");
    await service.chordProgressionRepository.put(createProgression());
    await service.chordProgressionFavoriteRepository.add("custom-chords");
    await service.practicePresetRepository.put(createPreset());
    await service.practiceSessionRepository.put(createSession());
    await service.strummingPatternRepository.put(createStrummingPattern());
    expect(await service.chordProgressionRepository.list()).toHaveLength(1);
    expect(await service.chordProgressionFavoriteRepository.list()).toEqual([
      "custom-chords",
    ]);
    expect(await service.practicePresetRepository.list()).toHaveLength(1);
    expect(await service.practiceSessionRepository.list()).toHaveLength(1);
    expect(await service.strummingPatternRepository.list()).toHaveLength(1);

    await service.deleteCustomPattern("custom-pattern");
    expect(await service.patternRepository.list()).toEqual([]);
    expect(await service.favoriteRepository.list()).toEqual([]);

    await service.deleteCustomChordProgression("custom-chords");
    expect(await service.chordProgressionRepository.list()).toEqual([]);
    expect(await service.chordProgressionFavoriteRepository.list()).toEqual([]);
    service.close();
  });

  it("exports every IndexedDB entity as a detached snapshot", async () => {
    const service = new StorageService();
    await service.initialize(`web-band-test-${crypto.randomUUID()}`);
    const expected = createSnapshot("exported");
    await service.importSnapshot(expected, "replace");

    const snapshot = await service.exportSnapshot();
    expect(snapshot).toEqual(expected);
    snapshot.customPatterns[0]!.hits[0]!.velocity = 0;
    expect(
      (await service.exportSnapshot()).customPatterns[0]?.hits[0]?.velocity,
    ).toBe(expected.customPatterns[0]?.hits[0]?.velocity);
    service.close();
  });

  it("exports IndexedDB through one readonly transaction spanning all tables", async () => {
    const transaction = vi.spyOn(WebBandDatabase.prototype, "transaction");
    const service = new StorageService();
    await service.initialize(`web-band-test-${crypto.randomUUID()}`);

    await service.exportSnapshot();

    const readonlyCalls = transaction.mock.calls.filter(
      ([mode]) => mode === "r",
    );
    expect(readonlyCalls).toHaveLength(1);
    expect(readonlyCalls[0]?.[1]).toHaveLength(7);
    service.close();
  });

  it("merges IndexedDB snapshots with equal-ID upserts and no duplicates", async () => {
    const service = new StorageService();
    await service.initialize(`web-band-test-${crypto.randomUUID()}`);
    await service.importSnapshot(
      createSnapshot("shared", "Current"),
      "replace",
    );

    const imported = createSnapshot("shared", "Imported");
    const summary = await service.importSnapshot(imported, "merge");
    const snapshot = await service.exportSnapshot();

    expect(summary).toEqual({
      imported: {
        customChordProgressions: 1,
        customPatterns: 1,
        customStrummingPatterns: 1,
        favoriteChordProgressionIds: 1,
        favoritePatternIds: 1,
        practicePresets: 1,
        practiceSessions: 1,
      },
      mode: "merge",
      totalImported: 7,
    });
    expect(snapshot.customPatterns).toHaveLength(1);
    expect(snapshot.customPatterns[0]?.name).toBe("Imported Pattern");
    expect(snapshot.customChordProgressions).toHaveLength(1);
    expect(snapshot.customChordProgressions[0]?.name).toBe("Imported Chords");
    expect(snapshot.customStrummingPatterns).toHaveLength(1);
    expect(snapshot.customStrummingPatterns[0]?.name).toBe(
      "Imported Strumming",
    );
    expect(snapshot.practicePresets).toHaveLength(1);
    expect(snapshot.practicePresets[0]?.name).toBe("Imported Preset");
    expect(snapshot.practiceSessions).toHaveLength(1);
    expect(snapshot.practiceSessions[0]?.patternName).toBe("Imported Pattern");
    expect(snapshot.favoritePatternIds).toEqual(["shared-pattern"]);
    expect(snapshot.favoriteChordProgressionIds).toEqual(["shared-chords"]);
    service.close();
  });

  it("replaces every IndexedDB import-domain table", async () => {
    const service = new StorageService();
    await service.initialize(`web-band-test-${crypto.randomUUID()}`);
    await service.importSnapshot(createSnapshot("old"), "replace");
    const replacement = createSnapshot("new");

    const summary = await service.importSnapshot(replacement, "replace");

    expect(await service.exportSnapshot()).toEqual(replacement);
    expect(summary.mode).toBe("replace");
    expect(summary.totalImported).toBe(7);
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

  it("rolls back pattern and favorite deletion together", async () => {
    const service = new StorageService();
    await service.initialize(`web-band-test-${crypto.randomUUID()}`);
    const pattern = createPattern();
    await service.patternRepository.put(pattern);
    await service.favoriteRepository.add(pattern.id);
    vi.spyOn(service.favoriteRepository, "remove").mockRejectedValueOnce(
      new Error("favorite delete failed"),
    );

    await expect(service.deleteCustomPattern(pattern.id)).rejects.toThrow(
      "favorite delete failed",
    );
    expect(await service.patternRepository.get(pattern.id)).toEqual(pattern);
    expect(await service.favoriteRepository.list()).toEqual([pattern.id]);
    service.close();
  });

  it("recovers readable data from a repository failure after opening IndexedDB", async () => {
    const service = new StorageService();
    expect(
      await service.initialize(`web-band-test-${crypto.randomUUID()}`),
    ).toEqual({ mode: "indexed-db", warning: null });
    const chordProgressions = service.chordProgressionRepository;
    const chordProgressionFavorites =
      service.chordProgressionFavoriteRepository;
    const practicePresets = service.practicePresetRepository;
    const preservedPattern = createPattern("preserved-pattern");
    await service.patternRepository.put(preservedPattern);
    vi.spyOn(practicePresets, "list").mockRejectedValueOnce(
      new Error("repository read failed"),
    );

    await expect(practicePresets.list()).rejects.toThrow(
      "repository read failed",
    );
    const status = await service.recoverFromIndexedDbFailure();

    expect(status.mode).toBe("memory");
    expect(status.warning).toContain("Practice can continue");
    expect(service.currentStatus).toEqual(status);
    expect(service.chordProgressionRepository).not.toBe(chordProgressions);
    expect(service.chordProgressionFavoriteRepository).not.toBe(
      chordProgressionFavorites,
    );
    expect(service.practicePresetRepository).not.toBe(practicePresets);
    expect(await service.patternRepository.get(preservedPattern.id)).toEqual(
      preservedPattern,
    );
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
    await service.practiceSessionRepository.put(createSession());
    await service.strummingPatternRepository.put(createStrummingPattern());
    expect(await service.chordProgressionRepository.list()).toHaveLength(1);
    expect(await service.chordProgressionFavoriteRepository.list()).toEqual([
      "custom-chords",
    ]);
    expect(await service.practicePresetRepository.list()).toHaveLength(1);
    expect(await service.practiceSessionRepository.list()).toHaveLength(1);
    expect(await service.strummingPatternRepository.list()).toHaveLength(1);

    await service.deleteCustomChordProgression("custom-chords");
    expect(await service.chordProgressionRepository.list()).toEqual([]);
    expect(await service.chordProgressionFavoriteRepository.list()).toEqual([]);

    service.close();
    expect(await service.chordProgressionRepository.list()).toEqual([]);
    expect(await service.chordProgressionFavoriteRepository.list()).toEqual([]);
    expect(await service.practicePresetRepository.list()).toEqual([]);
    expect(await service.practiceSessionRepository.list()).toEqual([]);
    expect(await service.strummingPatternRepository.list()).toEqual([]);
  });

  it("merges and safely replaces snapshots in memory fallback mode", async () => {
    vi.stubGlobal("indexedDB", undefined);
    const service = new StorageService();
    await service.initialize();
    const current = createSnapshot("current");
    const imported = createSnapshot("imported");
    await service.importSnapshot(current, "replace");

    await service.importSnapshot(imported, "merge");
    let snapshot = await service.exportSnapshot();
    expect(snapshot.customPatterns.map(({ id }) => id)).toEqual([
      "current-pattern",
      "imported-pattern",
    ]);
    expect(snapshot.favoritePatternIds).toEqual([
      "current-pattern",
      "imported-pattern",
    ]);

    const invalid = structuredClone(imported);
    invalid.practiceSessions[0]!.endedAt = "invalid";
    const beforeFailure = await service.exportSnapshot();
    await expect(service.importSnapshot(invalid, "replace")).rejects.toThrow(
      "Only valid practice sessions can be saved.",
    );
    expect(await service.exportSnapshot()).toEqual(beforeFailure);

    await service.importSnapshot(imported, "replace");
    snapshot = await service.exportSnapshot();
    expect(snapshot).toEqual(imported);
    service.close();
  });
});
