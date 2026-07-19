import { create } from "zustand";

import type {
  CorruptRowCounts,
  IndexedDbCollection,
} from "@/db/repositories/repository-helpers";
import type { PersistenceMode } from "@/types/persistence";

export const corruptRowCollectionLabels = {
  chordProgressions: "Custom chord progressions",
  customPatterns: "Custom drum patterns",
  favoriteChordProgressions: "Favorite chord progressions",
  favoritePatterns: "Favorite drum patterns",
  practicePresets: "Practice presets",
  practiceSessions: "Practice history",
  strummingPatterns: "Custom strumming patterns",
} satisfies Record<IndexedDbCollection, string>;

interface StorageStore {
  corruptRowCounts: CorruptRowCounts;
  isInitialized: boolean;
  mode: PersistenceMode;
  preferenceWriteFailures: string[];
  warning: string | null;
  setCorruptRowCounts: (counts: CorruptRowCounts) => void;
  setStorageStatus: (mode: PersistenceMode, warning: string | null) => void;
}

export const useStorageStore = create<StorageStore>((set) => ({
  corruptRowCounts: {},
  isInitialized: false,
  mode: "memory",
  preferenceWriteFailures: [],
  warning: null,
  setCorruptRowCounts: (counts) =>
    set((state) => {
      const currentEntries = Object.entries(state.corruptRowCounts);
      const nextEntries = Object.entries(counts);
      if (
        currentEntries.length === nextEntries.length &&
        nextEntries.every(
          ([collection, count]) =>
            state.corruptRowCounts[collection as IndexedDbCollection] === count,
        )
      ) {
        return state;
      }
      return { corruptRowCounts: { ...counts } };
    }),
  setStorageStatus: (mode, warning) =>
    set({ isInitialized: true, mode, warning }),
}));

export function reportPreferenceWrite(area: string, succeeded: boolean): void {
  const normalizedArea = area.trim();
  if (!normalizedArea) return;

  useStorageStore.setState((state) => {
    const hasFailure = state.preferenceWriteFailures.includes(normalizedArea);
    if (succeeded) {
      return hasFailure
        ? {
            preferenceWriteFailures: state.preferenceWriteFailures.filter(
              (failure) => failure !== normalizedArea,
            ),
          }
        : state;
    }
    return hasFailure
      ? state
      : {
          preferenceWriteFailures: [
            ...state.preferenceWriteFailures,
            normalizedArea,
          ],
        };
  });
}
