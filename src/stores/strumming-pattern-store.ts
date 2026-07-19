import { create } from "zustand";

import { storageService } from "@/db/storage-service";
import { isCustomStrummingPattern } from "@/lib/persistence-validation";
import { executeStorageOperation } from "@/lib/storage-execution";
import type { TimeSignature } from "@/types/pattern";
import type { CustomStrummingPattern } from "@/types/persistence";
import type { StrumAction, StrumStep } from "@/types/practice";

export interface StrummingPatternStepInput {
  accent?: boolean;
  action: StrumAction;
}

export interface StrummingPatternInput {
  name: string;
  steps: StrummingPatternStepInput[];
  subdivision: 8 | 16;
  timeSignature: TimeSignature;
}

interface StrummingPatternStore {
  customPatterns: CustomStrummingPattern[];
  isHydrated: boolean;
  create: (input: StrummingPatternInput) => Promise<CustomStrummingPattern>;
  delete: (patternId: string) => Promise<void>;
  hydrate: () => Promise<void>;
  refreshAfterImport: () => Promise<void>;
  update: (
    patternId: string,
    changes: Partial<StrummingPatternInput>,
  ) => Promise<CustomStrummingPattern>;
}

function sortPatterns(
  patterns: CustomStrummingPattern[],
): CustomStrummingPattern[] {
  return patterns.sort(
    (left, right) =>
      right.updatedAt.localeCompare(left.updatedAt) ||
      left.id.localeCompare(right.id),
  );
}

function createSteps(steps: StrummingPatternStepInput[]): StrumStep[] {
  return steps.map((step, subdivisionIndex) => ({
    ...(step.accent === undefined ? {} : { accent: step.accent }),
    action: step.action,
    id: crypto.randomUUID(),
    subdivisionIndex,
  }));
}

function assertValidPattern(pattern: CustomStrummingPattern): void {
  if (!isCustomStrummingPattern(pattern)) {
    throw new Error("Only valid custom strumming patterns can be saved.");
  }
}

export const useStrummingPatternStore = create<StrummingPatternStore>(
  (set, get) => ({
    create: async (input) => {
      const timestamp = new Date().toISOString();
      const pattern: CustomStrummingPattern = {
        createdAt: timestamp,
        id: crypto.randomUUID(),
        isBuiltIn: false,
        name: input.name.trim(),
        steps: createSteps(input.steps),
        subdivision: input.subdivision,
        timeSignature: structuredClone(input.timeSignature),
        updatedAt: timestamp,
      };
      assertValidPattern(pattern);
      await executeStorageOperation(() =>
        storageService.strummingPatternRepository.put(pattern),
      );
      set({
        customPatterns: sortPatterns([pattern, ...get().customPatterns]),
      });
      return structuredClone(pattern);
    },
    customPatterns: [],
    delete: async (patternId) => {
      if (!get().customPatterns.some(({ id }) => id === patternId)) {
        throw new Error("Custom strumming pattern was not found.");
      }
      await executeStorageOperation(() =>
        storageService.strummingPatternRepository.delete(patternId),
      );
      set({
        customPatterns: get().customPatterns.filter(
          ({ id }) => id !== patternId,
        ),
      });
    },
    hydrate: async () => {
      try {
        await storageService.initialize();
        const customPatterns =
          await storageService.strummingPatternRepository.list();
        set({ customPatterns, isHydrated: true });
      } catch (error) {
        set({ isHydrated: true });
        throw error;
      }
    },
    isHydrated: false,
    refreshAfterImport: async () =>
      executeStorageOperation(() => get().hydrate()),
    update: async (patternId, changes) => {
      const current = get().customPatterns.find(({ id }) => id === patternId);
      if (!current) {
        throw new Error("Custom strumming pattern was not found.");
      }
      const pattern: CustomStrummingPattern = {
        ...structuredClone(current),
        ...(changes.name === undefined ? {} : { name: changes.name.trim() }),
        ...(changes.steps === undefined
          ? {}
          : { steps: createSteps(changes.steps) }),
        ...(changes.subdivision === undefined
          ? {}
          : { subdivision: changes.subdivision }),
        ...(changes.timeSignature === undefined
          ? {}
          : { timeSignature: structuredClone(changes.timeSignature) }),
        updatedAt: new Date().toISOString(),
      };
      assertValidPattern(pattern);
      await executeStorageOperation(() =>
        storageService.strummingPatternRepository.put(pattern),
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
  }),
);
