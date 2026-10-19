import Dexie from "dexie";
import { describe, expect, it } from "vitest";
import { StorageService } from "@/db/storage-service";
import { createDefaultMetronomeConfiguration } from "@/lib/metronome";
import type {
  PracticePreset,
  MetronomePracticeSession,
} from "@/types/persistence";

describe("metronome IndexedDB compatibility", () => {
  it("round-trips new records alongside legacy presets and recovers them to memory", async () => {
    const name = `metronome-storage-${crypto.randomUUID()}`;
    const storage = new StorageService();
    const timestamp = "2026-10-19T12:00:00.000Z";
    const base = {
      id: "metronome",
      name: "Click practice",
      createdAt: timestamp,
      updatedAt: timestamp,
      lastUsedAt: null,
      isFavorite: false,
    };
    const preset: PracticePreset = {
      ...base,
      configuration: {
        bpm: 80,
        countInMeasures: 0,
        guidedPractice: {
          mode: "metronome",
          metronome: createDefaultMetronomeConfiguration(),
        },
      },
    };
    const legacy: PracticePreset = {
      ...base,
      id: "legacy",
      name: "Legacy groove",
      configuration: {
        bpm: 90,
        countInMeasures: 1,
        patternId: "basic-rock",
        swing: 0.1,
        humanization: 0.2,
        fillFrequency: null,
        guidedPractice: { mode: "drums" },
      },
    };
    const session: MetronomePracticeSession = {
      id: "session",
      createdAt: timestamp,
      updatedAt: timestamp,
      startedAt: timestamp,
      endedAt: "2026-10-19T12:01:00.000Z",
      durationSeconds: 60,
      startingBpm: 80,
      endingBpm: 80,
      practiceMode: "metronome",
      timeSignature: "4/4",
      metronome: { trainingMode: "manual", subdivision: 1 },
    };
    try {
      expect((await storage.initialize(name)).mode).toBe("indexed-db");
      await storage.practicePresetRepository.put(legacy);
      await storage.practicePresetRepository.put(preset);
      await storage.practiceSessionRepository.put(session);
      const snapshot = await storage.exportSnapshot();
      expect(snapshot.practicePresets).toEqual(
        expect.arrayContaining([legacy, preset]),
      );
      expect(snapshot.practiceSessions).toEqual([session]);
      expect((await storage.recoverFromIndexedDbFailure()).mode).toBe("memory");
      expect(await storage.exportSnapshot()).toEqual(snapshot);
    } finally {
      // Recovery closes the database before switching repositories.
      await Dexie.delete(name);
    }
  });
});
