import { create } from "zustand";

import { storageService } from "@/db/storage-service";
import { isPracticeSession } from "@/lib/persistence-validation";
import { executeStorageOperation } from "@/lib/storage-execution";
import type { PracticeSession } from "@/types/persistence";

interface PracticeHistoryStore {
  errorMessage: string | null;
  isHydrated: boolean;
  isLoading: boolean;
  sessions: PracticeSession[];
  clearAll: () => Promise<void>;
  deleteOne: (sessionId: string) => Promise<void>;
  flushPendingWrites: () => Promise<void>;
  hydrate: () => Promise<void>;
  record: (session: PracticeSession) => Promise<void>;
  refreshAfterImport: () => Promise<void>;
}

let operationQueue = Promise.resolve();

function enqueue<T>(operation: () => Promise<T>): Promise<T> {
  const result = operationQueue.then(operation, operation);
  operationQueue = result.then(
    () => undefined,
    () => undefined,
  );
  return result;
}

function sortSessions(sessions: PracticeSession[]): PracticeSession[] {
  return sessions.sort(
    (left, right) =>
      right.startedAt.localeCompare(left.startedAt) ||
      left.id.localeCompare(right.id),
  );
}

function errorMessage(error: unknown, fallback: string): string {
  return error instanceof Error && error.message ? error.message : fallback;
}

export const usePracticeHistoryStore = create<PracticeHistoryStore>(
  (set, get) => {
    async function hydrate(): Promise<void> {
      set({ isLoading: true });
      return enqueue(async () => {
        try {
          await storageService.initialize();
          const sessions =
            await storageService.practiceSessionRepository.list();
          set({
            errorMessage: null,
            isHydrated: true,
            isLoading: false,
            sessions,
          });
        } catch (error) {
          set({
            errorMessage: errorMessage(
              error,
              "Practice history could not be loaded.",
            ),
            isHydrated: true,
            isLoading: false,
          });
          throw error;
        }
      });
    }

    return {
      clearAll: () =>
        enqueue(async () => {
          try {
            await executeStorageOperation(() =>
              storageService.practiceSessionRepository.clear(),
            );
            set({ errorMessage: null, sessions: [] });
          } catch (error) {
            set({
              errorMessage: errorMessage(
                error,
                "Practice history could not be cleared.",
              ),
            });
            throw error;
          }
        }),
      deleteOne: (sessionId) =>
        enqueue(async () => {
          try {
            await executeStorageOperation(() =>
              storageService.practiceSessionRepository.delete(sessionId),
            );
            set({
              errorMessage: null,
              sessions: get().sessions.filter(({ id }) => id !== sessionId),
            });
          } catch (error) {
            set({
              errorMessage: errorMessage(
                error,
                "The practice session could not be deleted.",
              ),
            });
            throw error;
          }
        }),
      errorMessage: null,
      flushPendingWrites: () => operationQueue,
      hydrate,
      isHydrated: false,
      isLoading: false,
      record: (session) => {
        if (!isPracticeSession(session)) {
          return Promise.reject(
            new Error("Only a valid practice session can be recorded."),
          );
        }
        const snapshot = structuredClone(session);
        return enqueue(async () => {
          try {
            await executeStorageOperation(() =>
              storageService.practiceSessionRepository.put(snapshot),
            );
            set({
              errorMessage: null,
              sessions: sortSessions([
                snapshot,
                ...get().sessions.filter(({ id }) => id !== snapshot.id),
              ]),
            });
          } catch (error) {
            set({
              errorMessage: errorMessage(
                error,
                "The practice session could not be saved.",
              ),
            });
            throw error;
          }
        });
      },
      refreshAfterImport: () => executeStorageOperation(hydrate),
      sessions: [],
    };
  },
);
