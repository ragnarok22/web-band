import { create } from "zustand";

import {
  loadRecentPatternIds,
  saveRecentPatternIds,
} from "@/db/repositories/pattern-preferences-repository";
import { builtInPatterns } from "@/data/patterns";
import { storageService } from "@/db/storage-service";
import {
  createDefaultPatternDraft,
  duplicatePatternDraft,
} from "@/lib/drum-pattern-editor";
import type { CustomDrumPattern } from "@/types/persistence";

export type PatternChanges = Partial<
  Omit<CustomDrumPattern, "createdAt" | "id" | "isBuiltIn" | "updatedAt">
>;

interface PatternStore {
  customPatterns: CustomDrumPattern[];
  favoritePatternIds: string[];
  isHydrated: boolean;
  recentPatternIds: string[];
  create: (pattern?: CustomDrumPattern) => Promise<CustomDrumPattern>;
  delete: (patternId: string) => Promise<void>;
  duplicate: (patternId: string) => Promise<CustomDrumPattern>;
  hydrate: () => Promise<void>;
  markRecent: (patternId: string) => void;
  refreshAfterImport: () => Promise<void>;
  toggleFavorite: (patternId: string) => Promise<void>;
  update: (
    patternId: string,
    changes: PatternChanges,
  ) => Promise<CustomDrumPattern>;
}

const builtInPatternIds = new Set(builtInPatterns.map(({ id }) => id));

function sortPatterns(patterns: CustomDrumPattern[]): CustomDrumPattern[] {
  return patterns.sort(
    (left, right) =>
      right.updatedAt.localeCompare(left.updatedAt) ||
      left.id.localeCompare(right.id),
  );
}

function assertCustomTarget(
  patternId: string,
  patterns: readonly CustomDrumPattern[],
): CustomDrumPattern {
  const pattern = patterns.find(({ id }) => id === patternId);
  if (pattern) return pattern;
  if (builtInPatternIds.has(patternId)) {
    throw new Error("Built-in patterns cannot be edited or deleted.");
  }
  throw new Error("Custom pattern was not found.");
}

function unavailableIds(patterns: readonly CustomDrumPattern[]): string[] {
  return [...builtInPatternIds, ...patterns.map(({ id }) => id)];
}

export const usePatternStore = create<PatternStore>((set, get) => ({
  create: async (input) => {
    const current = get().customPatterns;
    const pattern = structuredClone(
      input ?? createDefaultPatternDraft(unavailableIds(current)),
    );
    if (
      builtInPatternIds.has(pattern.id) ||
      current.some(({ id }) => id === pattern.id)
    ) {
      throw new Error("Pattern ID is already in use.");
    }
    await storageService.initialize();
    await storageService.patternRepository.put(pattern);
    set({ customPatterns: sortPatterns([pattern, ...get().customPatterns]) });
    return structuredClone(pattern);
  },
  customPatterns: [],
  delete: async (patternId) => {
    assertCustomTarget(patternId, get().customPatterns);
    await storageService.initialize();
    await storageService.deleteCustomPattern(patternId);
    set({
      customPatterns: get().customPatterns.filter(({ id }) => id !== patternId),
      favoritePatternIds: get().favoritePatternIds.filter(
        (id) => id !== patternId,
      ),
    });
  },
  duplicate: async (patternId) => {
    const current = get().customPatterns;
    const source =
      current.find(({ id }) => id === patternId) ??
      builtInPatterns.find(({ id }) => id === patternId);
    if (!source) throw new Error("Pattern to duplicate was not found.");
    const pattern = duplicatePatternDraft(source, unavailableIds(current));
    await storageService.initialize();
    await storageService.patternRepository.put(pattern);
    set({ customPatterns: sortPatterns([pattern, ...get().customPatterns]) });
    return structuredClone(pattern);
  },
  favoritePatternIds: [],
  isHydrated: false,
  recentPatternIds: [],
  hydrate: async () => {
    try {
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
    } catch (error) {
      set({ isHydrated: true });
      throw error;
    }
  },
  markRecent: (patternId) => {
    const recentPatternIds = [
      patternId,
      ...get().recentPatternIds.filter((id) => id !== patternId),
    ].slice(0, 20);
    set({ recentPatternIds });
    saveRecentPatternIds(recentPatternIds);
  },
  refreshAfterImport: async () => get().hydrate(),
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
  update: async (patternId, changes) => {
    const current = assertCustomTarget(patternId, get().customPatterns);
    const pattern: CustomDrumPattern = {
      ...structuredClone(current),
      ...structuredClone(changes),
      createdAt: current.createdAt,
      id: current.id,
      isBuiltIn: false,
      updatedAt: new Date().toISOString(),
    };
    await storageService.initialize();
    await storageService.patternRepository.put(pattern);
    set({
      customPatterns: sortPatterns(
        get().customPatterns.map((candidate) =>
          candidate.id === patternId ? pattern : candidate,
        ),
      ),
    });
    return structuredClone(pattern);
  },
}));
