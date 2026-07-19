import { create } from "zustand";

import {
  loadRecentPatternIds,
  saveRecentPatternIds,
} from "@/db/repositories/pattern-preferences-repository";
import { basicRockPattern, builtInPatterns } from "@/data/patterns";
import { storageService } from "@/db/storage-service";
import {
  createDefaultPatternDraft,
  duplicatePatternDraft,
} from "@/lib/drum-pattern-editor";
import { isCustomDrumPattern } from "@/lib/persistence-validation";
import { executeStorageOperation } from "@/lib/storage-execution";
import { usePracticeStore } from "@/stores/practice-store";
import { reportPreferenceWrite } from "@/stores/storage-store";
import type { CustomDrumPattern } from "@/types/persistence";
import type { ImportedPattern } from "@/types/pattern-sharing";

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
  importPatterns: (
    patterns: readonly CustomDrumPattern[],
  ) => Promise<ImportedPattern[]>;
  markRecent: (patternId: string) => void;
  replaceRecentPatternIds: (patternIds: string[]) => boolean;
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
    if (!isCustomDrumPattern(pattern)) {
      throw new Error("Only valid custom patterns can be saved.");
    }
    await executeStorageOperation(() =>
      storageService.patternRepository.put(pattern),
    );
    set({ customPatterns: sortPatterns([pattern, ...get().customPatterns]) });
    return structuredClone(pattern);
  },
  customPatterns: [],
  delete: async (patternId) => {
    assertCustomTarget(patternId, get().customPatterns);
    await executeStorageOperation(() =>
      storageService.deleteCustomPattern(patternId),
    );
    const recentPatternIds = get().recentPatternIds.filter(
      (id) => id !== patternId,
    );
    set({
      customPatterns: get().customPatterns.filter(({ id }) => id !== patternId),
      favoritePatternIds: get().favoritePatternIds.filter(
        (id) => id !== patternId,
      ),
      recentPatternIds,
    });
    reportPreferenceWrite(
      "recent patterns",
      saveRecentPatternIds(recentPatternIds),
    );
    if (usePracticeStore.getState().selectedPatternId === patternId) {
      usePracticeStore.getState().setSelectedPatternId(basicRockPattern.id);
    }
  },
  duplicate: async (patternId) => {
    const current = get().customPatterns;
    const source =
      current.find(({ id }) => id === patternId) ??
      builtInPatterns.find(({ id }) => id === patternId);
    if (!source) throw new Error("Pattern to duplicate was not found.");
    const pattern = duplicatePatternDraft(source, unavailableIds(current));
    await executeStorageOperation(() =>
      storageService.patternRepository.put(pattern),
    );
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
  importPatterns: async (patterns) => {
    if (!get().isHydrated) {
      throw new Error("Your pattern library is still loading.");
    }
    if (patterns.length === 0) {
      throw new Error("Choose at least one valid custom pattern to import.");
    }

    const current = get().customPatterns;
    const unavailable = unavailableIds(current);
    const unavailableSet = new Set(unavailable);
    const sourceIds = new Set<string>();
    const imported: ImportedPattern[] = [];
    for (const source of patterns) {
      if (!isCustomDrumPattern(source)) {
        throw new Error("Only valid custom patterns can be imported.");
      }
      if (sourceIds.has(source.id)) {
        throw new Error("Imported pattern IDs must be unique.");
      }
      sourceIds.add(source.id);

      if (unavailableSet.has(source.id)) {
        const pattern = duplicatePatternDraft(source, [...unavailableSet]);
        pattern.name = source.name;
        unavailableSet.add(pattern.id);
        imported.push({ pattern, resolution: "copied" });
      } else {
        const pattern = structuredClone(source);
        unavailableSet.add(pattern.id);
        imported.push({ pattern, resolution: "created" });
      }
    }

    await executeStorageOperation(() =>
      storageService.putCustomPatterns(imported.map(({ pattern }) => pattern)),
    );
    set({
      customPatterns: sortPatterns([
        ...imported.map(({ pattern }) => pattern),
        ...get().customPatterns,
      ]),
    });
    return structuredClone(imported);
  },
  markRecent: (patternId) => {
    const recentPatternIds = [
      patternId,
      ...get().recentPatternIds.filter((id) => id !== patternId),
    ].slice(0, 20);
    set({ recentPatternIds });
    reportPreferenceWrite(
      "recent patterns",
      saveRecentPatternIds(recentPatternIds),
    );
  },
  replaceRecentPatternIds: (patternIds) => {
    const recentPatternIds = [...new Set(patternIds)].slice(0, 20);
    set({ recentPatternIds });
    const persisted = saveRecentPatternIds(recentPatternIds);
    reportPreferenceWrite("recent patterns", persisted);
    return persisted;
  },
  refreshAfterImport: async () =>
    executeStorageOperation(() => get().hydrate()),
  toggleFavorite: async (patternId) => {
    const previousIds = get().favoritePatternIds;
    const isFavorite = previousIds.includes(patternId);
    const favoritePatternIds = isFavorite
      ? previousIds.filter((id) => id !== patternId)
      : [patternId, ...previousIds];

    set({ favoritePatternIds });
    try {
      await executeStorageOperation(() =>
        isFavorite
          ? storageService.favoriteRepository.remove(patternId)
          : storageService.favoriteRepository.add(patternId),
      );
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
    if (!isCustomDrumPattern(pattern)) {
      throw new Error("Only valid custom patterns can be saved.");
    }
    await executeStorageOperation(() =>
      storageService.patternRepository.put(pattern),
    );
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
