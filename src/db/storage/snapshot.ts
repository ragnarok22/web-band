import type { WebBandDatabase } from "@/db/database";
import {
  isCustomDrumPattern,
  isCustomStrummingPattern,
  isPracticeSession,
} from "@/lib/persistence-validation";
import {
  isCustomChordProgression,
  isPracticePreset,
} from "@/lib/practice-validation";
import type {
  ImportCollectionCounts,
  ImportMode,
  ImportSummary,
  PersistenceSnapshot,
} from "@/types/persistence";
import type { StorageRepositories } from "./repositories";

function isReadableId(value: unknown): value is string {
  return (
    typeof value === "string" && value.trim() !== "" && value.length <= 128
  );
}

function validatedSnapshot(snapshot: PersistenceSnapshot): PersistenceSnapshot {
  return {
    customChordProgressions: snapshot.customChordProgressions.filter(
      isCustomChordProgression,
    ),
    customPatterns: snapshot.customPatterns.filter(isCustomDrumPattern),
    customStrummingPatterns: snapshot.customStrummingPatterns.filter(
      isCustomStrummingPattern,
    ),
    favoriteChordProgressionIds:
      snapshot.favoriteChordProgressionIds.filter(isReadableId),
    favoritePatternIds: snapshot.favoritePatternIds.filter(isReadableId),
    practicePresets: snapshot.practicePresets.filter(isPracticePreset),
    practiceSessions: snapshot.practiceSessions.filter(isPracticeSession),
  };
}

export async function readSnapshot(
  repositories: StorageRepositories,
  database: WebBandDatabase | null,
): Promise<PersistenceSnapshot> {
  const read = async (): Promise<PersistenceSnapshot> => {
    const [
      customPatterns,
      favoritePatternIds,
      customChordProgressions,
      favoriteChordProgressionIds,
      customStrummingPatterns,
      practicePresets,
      practiceSessions,
    ] = await Promise.all([
      repositories.patterns.list(),
      repositories.favorites.list(),
      repositories.chordProgressions.list(),
      repositories.chordProgressionFavorites.list(),
      repositories.strummingPatterns.list(),
      repositories.practicePresets.list(),
      repositories.practiceSessions.list(),
    ]);
    return {
      customChordProgressions,
      customPatterns,
      customStrummingPatterns,
      favoriteChordProgressionIds,
      favoritePatternIds,
      practicePresets,
      practiceSessions,
    };
  };
  const snapshot = database
    ? await database.transaction(
        "r",
        [
          database.customPatterns,
          database.favoritePatterns,
          database.chordProgressions,
          database.favoriteChordProgressions,
          database.strummingPatterns,
          database.practicePresets,
          database.practiceSessions,
        ],
        read,
      )
    : await read();
  return structuredClone(validatedSnapshot(snapshot));
}

// Recovery deliberately retains collections that can still be read when others fail.
export async function readReadableSnapshot(
  repositories: StorageRepositories,
): Promise<PersistenceSnapshot> {
  const results = await Promise.allSettled([
    repositories.patterns.list(),
    repositories.favorites.list(),
    repositories.chordProgressions.list(),
    repositories.chordProgressionFavorites.list(),
    repositories.strummingPatterns.list(),
    repositories.practicePresets.list(),
    repositories.practiceSessions.list(),
  ]);
  const value = <T>(index: number): T[] => {
    const result = results[index];
    return result?.status === "fulfilled" ? (result.value as T[]) : [];
  };
  return validatedSnapshot({
    customChordProgressions: value(2),
    customPatterns: value(0),
    customStrummingPatterns: value(4),
    favoriteChordProgressionIds: value(3),
    favoritePatternIds: value(1),
    practicePresets: value(5),
    practiceSessions: value(6),
  });
}

function mergeById<T extends { id: string }>(
  current: readonly T[],
  imported: readonly T[],
): T[] {
  const records = new Map(current.map((record) => [record.id, record]));
  for (const record of imported) records.set(record.id, record);
  return Array.from(records.values());
}

function mergeIds(current: readonly string[], imported: readonly string[]) {
  return Array.from(new Set([...current, ...imported])).sort((left, right) =>
    left.localeCompare(right),
  );
}

export function mergeSnapshots(
  current: PersistenceSnapshot,
  imported: PersistenceSnapshot,
): PersistenceSnapshot {
  return {
    customChordProgressions: mergeById(
      current.customChordProgressions,
      imported.customChordProgressions,
    ),
    customPatterns: mergeById(current.customPatterns, imported.customPatterns),
    customStrummingPatterns: mergeById(
      current.customStrummingPatterns,
      imported.customStrummingPatterns,
    ),
    favoriteChordProgressionIds: mergeIds(
      current.favoriteChordProgressionIds,
      imported.favoriteChordProgressionIds,
    ),
    favoritePatternIds: mergeIds(
      current.favoritePatternIds,
      imported.favoritePatternIds,
    ),
    practicePresets: mergeById(
      current.practicePresets,
      imported.practicePresets,
    ),
    practiceSessions: mergeById(
      current.practiceSessions,
      imported.practiceSessions,
    ),
  };
}

export function createImportSummary(
  snapshot: PersistenceSnapshot,
  mode: ImportMode,
): ImportSummary {
  const imported: ImportCollectionCounts = {
    customChordProgressions: snapshot.customChordProgressions.length,
    customPatterns: snapshot.customPatterns.length,
    customStrummingPatterns: snapshot.customStrummingPatterns.length,
    favoriteChordProgressionIds: snapshot.favoriteChordProgressionIds.length,
    favoritePatternIds: snapshot.favoritePatternIds.length,
    practicePresets: snapshot.practicePresets.length,
    practiceSessions: snapshot.practiceSessions.length,
  };
  return {
    imported,
    mode,
    totalImported: Object.values(imported).reduce(
      (total, count) => total + count,
      0,
    ),
  };
}
