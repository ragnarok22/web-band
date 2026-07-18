import { create } from "zustand";

import { storageService } from "@/db/storage-service";
import { isPracticePreset } from "@/lib/practice-validation";
import { executeStorageOperation } from "@/lib/storage-execution";
import {
  getGuidedPracticeConfiguration,
  useGuidedPracticeStore,
} from "@/stores/guided-practice-store";
import { usePracticeStore } from "@/stores/practice-store";
import type {
  PracticePreset,
  PracticePresetConfiguration,
  PracticePresetInput,
} from "@/types/persistence";

const MAX_RECENT_PRESETS = 20;

interface PracticePresetStore {
  isHydrated: boolean;
  presets: PracticePreset[];
  recentPresetIds: string[];
  createSnapshot: (
    input: string | PracticePresetInput,
    configuration?: PracticePresetConfiguration,
  ) => Promise<PracticePreset>;
  delete: (presetId: string) => Promise<void>;
  duplicate: (presetId: string, name?: string) => Promise<PracticePreset>;
  hydrate: () => Promise<void>;
  markUsed: (presetId: string) => Promise<void>;
  refreshAfterImport: () => Promise<void>;
  rename: (presetId: string, name: string) => Promise<PracticePreset>;
  toggleFavorite: (presetId: string) => Promise<void>;
  update: (
    presetId: string,
    configuration?: PracticePresetConfiguration,
  ) => Promise<PracticePreset>;
}

function getCurrentConfiguration(): PracticePresetConfiguration {
  const practice = usePracticeStore.getState();
  return {
    bpm: practice.bpm,
    countInMeasures: practice.countInMeasures,
    fillFrequency: practice.fillFrequency,
    guidedPractice: getGuidedPracticeConfiguration(
      useGuidedPracticeStore.getState(),
    ),
    humanization: practice.humanization,
    patternId: practice.selectedPatternId,
    swing: practice.swing,
  };
}

function sortPresets(presets: PracticePreset[]): PracticePreset[] {
  return presets.sort(
    (left, right) =>
      right.updatedAt.localeCompare(left.updatedAt) ||
      left.id.localeCompare(right.id),
  );
}

function getRecentPresetIds(presets: readonly PracticePreset[]): string[] {
  return presets
    .filter(
      (preset): preset is PracticePreset & { lastUsedAt: string } =>
        preset.lastUsedAt !== null,
    )
    .sort(
      (left, right) =>
        right.lastUsedAt.localeCompare(left.lastUsedAt) ||
        left.id.localeCompare(right.id),
    )
    .slice(0, MAX_RECENT_PRESETS)
    .map(({ id }) => id);
}

export const usePracticePresetStore = create<PracticePresetStore>(
  (set, get) => {
    async function savePreset(preset: PracticePreset): Promise<PracticePreset> {
      if (!isPracticePreset(preset)) {
        throw new Error("Only valid practice presets can be saved.");
      }
      await executeStorageOperation(() =>
        storageService.practicePresetRepository.put(preset),
      );
      const presets = sortPresets([
        preset,
        ...get().presets.filter(({ id }) => id !== preset.id),
      ]);
      set({ presets, recentPresetIds: getRecentPresetIds(presets) });
      return structuredClone(preset);
    }

    function findPreset(presetId: string): PracticePreset {
      const preset = get().presets.find(({ id }) => id === presetId);
      if (!preset) throw new Error("Practice preset was not found.");
      return preset;
    }

    return {
      createSnapshot: async (input, configuration) => {
        const values: PracticePresetInput =
          typeof input === "string"
            ? {
                configuration: configuration ?? getCurrentConfiguration(),
                name: input,
              }
            : input;
        const timestamp = new Date().toISOString();
        return savePreset({
          configuration: structuredClone(values.configuration),
          createdAt: timestamp,
          id: crypto.randomUUID(),
          isFavorite: values.isFavorite ?? false,
          lastUsedAt: null,
          name: values.name.trim(),
          updatedAt: timestamp,
        });
      },
      delete: async (presetId) => {
        findPreset(presetId);
        await executeStorageOperation(() =>
          storageService.practicePresetRepository.delete(presetId),
        );
        const presets = get().presets.filter(({ id }) => id !== presetId);
        set({ presets, recentPresetIds: getRecentPresetIds(presets) });
      },
      duplicate: async (presetId, name) => {
        const source = findPreset(presetId);
        const timestamp = new Date().toISOString();
        return savePreset({
          configuration: structuredClone(source.configuration),
          createdAt: timestamp,
          id: crypto.randomUUID(),
          isFavorite: false,
          lastUsedAt: null,
          name: (name ?? `${source.name} copy`).trim(),
          updatedAt: timestamp,
        });
      },
      hydrate: async () => {
        try {
          await storageService.initialize();
          const presets = await storageService.practicePresetRepository.list();
          set({
            isHydrated: true,
            presets,
            recentPresetIds: getRecentPresetIds(presets),
          });
        } catch (error) {
          set({ isHydrated: true });
          throw error;
        }
      },
      isHydrated: false,
      markUsed: async (presetId) => {
        const preset = findPreset(presetId);
        const timestamp = new Date().toISOString();
        await savePreset({
          ...structuredClone(preset),
          lastUsedAt: timestamp,
        });
      },
      presets: [],
      recentPresetIds: [],
      refreshAfterImport: async () =>
        executeStorageOperation(() => get().hydrate()),
      rename: async (presetId, name) => {
        const preset = findPreset(presetId);
        return savePreset({
          ...structuredClone(preset),
          name: name.trim(),
          updatedAt: new Date().toISOString(),
        });
      },
      toggleFavorite: async (presetId) => {
        const preset = findPreset(presetId);
        await savePreset({
          ...structuredClone(preset),
          isFavorite: !preset.isFavorite,
          updatedAt: new Date().toISOString(),
        });
      },
      update: async (presetId, configuration) => {
        const preset = findPreset(presetId);
        return savePreset({
          ...structuredClone(preset),
          configuration: structuredClone(
            configuration ?? getCurrentConfiguration(),
          ),
          updatedAt: new Date().toISOString(),
        });
      },
    };
  },
);
