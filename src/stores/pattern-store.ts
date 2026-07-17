import { create } from "zustand";

import {
  loadRecentPatternIds,
  saveRecentPatternIds,
} from "@/db/repositories/pattern-preferences-repository";
import { storageService } from "@/db/storage-service";
import type { DrumPattern } from "@/types/pattern";

interface PatternStore {
  customPatterns: DrumPattern[];
  favoritePatternIds: string[];
  isHydrated: boolean;
  recentPatternIds: string[];
  hydrate: () => Promise<void>;
  markRecent: (patternId: string) => void;
  toggleFavorite: (patternId: string) => Promise<void>;
}

export const usePatternStore = create<PatternStore>((set, get) => ({
  customPatterns: [],
  favoritePatternIds: [],
  isHydrated: false,
  recentPatternIds: [],
  hydrate: async () => {
    await storageService.initialize();
    const [customPatterns, favoritePatternIds] = await Promise.all([
      storageService.patternRepository.list(),
      storageService.favoriteRepository.list(),
    ]);
    set({
      customPatterns,
      favoritePatternIds,
      isHydrated: true,
      recentPatternIds: loadRecentPatternIds(),
    });
  },
  markRecent: (patternId) => {
    const recentPatternIds = [
      patternId,
      ...get().recentPatternIds.filter((id) => id !== patternId),
    ].slice(0, 20);
    set({ recentPatternIds });
    saveRecentPatternIds(recentPatternIds);
  },
  toggleFavorite: async (patternId) => {
    const previousIds = get().favoritePatternIds;
    const isFavorite = previousIds.includes(patternId);
    const favoritePatternIds = isFavorite
      ? previousIds.filter((id) => id !== patternId)
      : [patternId, ...previousIds];

    set({ favoritePatternIds });
    try {
      await storageService.initialize();
      if (isFavorite) {
        await storageService.favoriteRepository.remove(patternId);
      } else {
        await storageService.favoriteRepository.add(patternId);
      }
    } catch {
      set({ favoritePatternIds: previousIds });
      throw new Error("Favorite could not be saved locally.");
    }
  },
}));
