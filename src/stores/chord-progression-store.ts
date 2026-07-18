import { create } from "zustand";

import { getBuiltInChordProgression } from "@/data/chord-progressions";
import { storageService } from "@/db/storage-service";
import type { CustomChordProgression } from "@/types/persistence";
import type { ChordStep } from "@/types/practice";

export interface ChordProgressionInput {
  name: string;
  steps: ChordStep[];
}

interface ChordProgressionStore {
  customProgressions: CustomChordProgression[];
  favoriteProgressionIds: string[];
  isHydrated: boolean;
  copyBuiltIn: (
    progressionId: string,
    name?: string,
  ) => Promise<CustomChordProgression>;
  create: (input: ChordProgressionInput) => Promise<CustomChordProgression>;
  delete: (progressionId: string) => Promise<void>;
  hydrate: () => Promise<void>;
  refreshAfterImport: () => Promise<void>;
  toggleFavorite: (progressionId: string) => Promise<void>;
  update: (
    progressionId: string,
    changes: Partial<ChordProgressionInput>,
  ) => Promise<CustomChordProgression>;
}

function sortProgressions(
  progressions: CustomChordProgression[],
): CustomChordProgression[] {
  return progressions.sort(
    (left, right) =>
      right.updatedAt.localeCompare(left.updatedAt) ||
      left.id.localeCompare(right.id),
  );
}

function createProgression(
  input: ChordProgressionInput,
): CustomChordProgression {
  const timestamp = new Date().toISOString();
  return {
    createdAt: timestamp,
    id: crypto.randomUUID(),
    isBuiltIn: false,
    name: input.name.trim(),
    steps: structuredClone(input.steps),
    updatedAt: timestamp,
  };
}

export const useChordProgressionStore = create<ChordProgressionStore>(
  (set, get) => ({
    copyBuiltIn: async (progressionId, name) => {
      const builtIn = getBuiltInChordProgression(progressionId);
      if (!builtIn) {
        throw new Error("Built-in chord progression was not found.");
      }

      const progression = createProgression({
        name: name ?? `${builtIn.name} copy`,
        steps: builtIn.steps.map((step) => ({
          ...structuredClone(step),
          id: crypto.randomUUID(),
        })),
      });
      await storageService.initialize();
      await storageService.chordProgressionRepository.put(progression);
      set({
        customProgressions: sortProgressions([
          progression,
          ...get().customProgressions,
        ]),
      });
      return structuredClone(progression);
    },
    create: async (input) => {
      const progression = createProgression(input);
      await storageService.initialize();
      await storageService.chordProgressionRepository.put(progression);
      set({
        customProgressions: sortProgressions([
          progression,
          ...get().customProgressions,
        ]),
      });
      return structuredClone(progression);
    },
    customProgressions: [],
    delete: async (progressionId) => {
      if (!get().customProgressions.some(({ id }) => id === progressionId)) {
        throw new Error("Custom chord progression was not found.");
      }

      await storageService.initialize();
      await storageService.deleteCustomChordProgression(progressionId);
      set({
        customProgressions: get().customProgressions.filter(
          ({ id }) => id !== progressionId,
        ),
        favoriteProgressionIds: get().favoriteProgressionIds.filter(
          (id) => id !== progressionId,
        ),
      });
    },
    favoriteProgressionIds: [],
    hydrate: async () => {
      try {
        await storageService.initialize();
        const [customProgressions, favoriteProgressionIds] = await Promise.all([
          storageService.chordProgressionRepository.list(),
          storageService.chordProgressionFavoriteRepository.list(),
        ]);
        set({ customProgressions, favoriteProgressionIds, isHydrated: true });
      } catch (error) {
        set({ isHydrated: true });
        throw error;
      }
    },
    isHydrated: false,
    refreshAfterImport: async () => get().hydrate(),
    toggleFavorite: async (progressionId) => {
      await storageService.initialize();
      const repository = storageService.chordProgressionFavoriteRepository;
      if (get().favoriteProgressionIds.includes(progressionId)) {
        await repository.remove(progressionId);
      } else {
        await repository.add(progressionId);
      }
      set({ favoriteProgressionIds: await repository.list() });
    },
    update: async (progressionId, changes) => {
      const current = get().customProgressions.find(
        ({ id }) => id === progressionId,
      );
      if (!current) {
        throw new Error("Custom chord progression was not found.");
      }

      const progression: CustomChordProgression = {
        ...structuredClone(current),
        ...(changes.name === undefined ? {} : { name: changes.name.trim() }),
        ...(changes.steps === undefined
          ? {}
          : { steps: structuredClone(changes.steps) }),
        updatedAt: new Date().toISOString(),
      };
      await storageService.initialize();
      await storageService.chordProgressionRepository.put(progression);
      set({
        customProgressions: sortProgressions(
          get().customProgressions.map((candidate) =>
            candidate.id === progressionId ? progression : candidate,
          ),
        ),
      });
      return structuredClone(progression);
    },
  }),
);
