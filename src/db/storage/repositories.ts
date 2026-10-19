import type { WebBandDatabase } from "@/db/database";
import {
  DexieChordProgressionFavoriteRepository,
  MemoryChordProgressionFavoriteRepository,
  type ChordProgressionFavoriteRepository,
} from "@/db/repositories/chord-progression-favorite-repository";
import {
  DexieChordProgressionRepository,
  MemoryChordProgressionRepository,
  type ChordProgressionRepository,
} from "@/db/repositories/chord-progression-repository";
import {
  DexieFavoriteRepository,
  MemoryFavoriteRepository,
  type FavoriteRepository,
} from "@/db/repositories/favorite-repository";
import {
  DexiePatternRepository,
  MemoryPatternRepository,
  type PatternRepository,
} from "@/db/repositories/pattern-repository";
import {
  DexiePracticePresetRepository,
  MemoryPracticePresetRepository,
  type PracticePresetRepository,
} from "@/db/repositories/practice-preset-repository";
import {
  DexiePracticeSessionRepository,
  MemoryPracticeSessionRepository,
  type PracticeSessionRepository,
} from "@/db/repositories/practice-session-repository";
import {
  DexieStrummingPatternRepository,
  MemoryStrummingPatternRepository,
  type StrummingPatternRepository,
} from "@/db/repositories/strumming-pattern-repository";
import type { IndexedDbCollection } from "@/db/repositories/repository-helpers";
import type { PersistenceSnapshot } from "@/types/persistence";

export interface StorageRepositories {
  chordProgressionFavorites: ChordProgressionFavoriteRepository;
  chordProgressions: ChordProgressionRepository;
  favorites: FavoriteRepository;
  patterns: PatternRepository;
  practicePresets: PracticePresetRepository;
  practiceSessions: PracticeSessionRepository;
  strummingPatterns: StrummingPatternRepository;
}

export function createMemoryRepositories(): StorageRepositories {
  return {
    chordProgressionFavorites: new MemoryChordProgressionFavoriteRepository(),
    chordProgressions: new MemoryChordProgressionRepository(),
    favorites: new MemoryFavoriteRepository(),
    patterns: new MemoryPatternRepository(),
    practicePresets: new MemoryPracticePresetRepository(),
    practiceSessions: new MemoryPracticeSessionRepository(),
    strummingPatterns: new MemoryStrummingPatternRepository(),
  };
}

export function createIndexedDbRepositories(
  database: WebBandDatabase,
  reportCorruptRows: (collection: IndexedDbCollection, count: number) => void,
): StorageRepositories {
  return {
    patterns: new DexiePatternRepository(database.customPatterns, (count) =>
      reportCorruptRows("customPatterns", count),
    ),
    favorites: new DexieFavoriteRepository(database.favoritePatterns, (count) =>
      reportCorruptRows("favoritePatterns", count),
    ),
    chordProgressions: new DexieChordProgressionRepository(
      database.chordProgressions,
      (count) => reportCorruptRows("chordProgressions", count),
    ),
    chordProgressionFavorites: new DexieChordProgressionFavoriteRepository(
      database.favoriteChordProgressions,
      (count) => reportCorruptRows("favoriteChordProgressions", count),
    ),
    practicePresets: new DexiePracticePresetRepository(
      database.practicePresets,
      (count) => reportCorruptRows("practicePresets", count),
    ),
    practiceSessions: new DexiePracticeSessionRepository(
      database.practiceSessions,
      (count) => reportCorruptRows("practiceSessions", count),
    ),
    strummingPatterns: new DexieStrummingPatternRepository(
      database.strummingPatterns,
      (count) => reportCorruptRows("strummingPatterns", count),
    ),
  };
}

export async function populateMemoryRepositories(
  repositories: StorageRepositories,
  snapshot: PersistenceSnapshot,
): Promise<void> {
  await Promise.all([
    ...snapshot.customPatterns.map((pattern) =>
      repositories.patterns.put(pattern),
    ),
    ...snapshot.favoritePatternIds.map((patternId) =>
      repositories.favorites.add(patternId),
    ),
    ...snapshot.customChordProgressions.map((progression) =>
      repositories.chordProgressions.put(progression),
    ),
    ...snapshot.favoriteChordProgressionIds.map((progressionId) =>
      repositories.chordProgressionFavorites.add(progressionId),
    ),
    ...snapshot.customStrummingPatterns.map((pattern) =>
      repositories.strummingPatterns.put(pattern),
    ),
    ...snapshot.practicePresets.map((preset) =>
      repositories.practicePresets.put(preset),
    ),
    ...snapshot.practiceSessions.map((session) =>
      repositories.practiceSessions.put(session),
    ),
  ]);
}
