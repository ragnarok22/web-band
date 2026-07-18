import { WebBandDatabase } from "@/db/database";
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
  PersistenceStatus,
} from "@/types/persistence";

const STORAGE_WARNING =
  "Local database storage is unavailable. Practice can continue, but new data will only last for this visit.";

interface MemoryRepositories {
  chordProgressionFavorites: ChordProgressionFavoriteRepository;
  chordProgressions: ChordProgressionRepository;
  favorites: FavoriteRepository;
  patterns: PatternRepository;
  practicePresets: PracticePresetRepository;
  practiceSessions: PracticeSessionRepository;
  strummingPatterns: StrummingPatternRepository;
}

function createMemoryRepositories(): MemoryRepositories {
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

function mergeSnapshots(
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

function createImportSummary(
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

export class StorageService {
  private chordProgressionFavorites: ChordProgressionFavoriteRepository =
    new MemoryChordProgressionFavoriteRepository();
  private chordProgressions: ChordProgressionRepository =
    new MemoryChordProgressionRepository();
  private database: WebBandDatabase | null = null;
  private favorites: FavoriteRepository = new MemoryFavoriteRepository();
  private initializePromise: Promise<PersistenceStatus> | null = null;
  private practicePresets: PracticePresetRepository =
    new MemoryPracticePresetRepository();
  private practiceSessions: PracticeSessionRepository =
    new MemoryPracticeSessionRepository();
  private repository: PatternRepository = new MemoryPatternRepository();
  private recoveryPromise: Promise<PersistenceStatus> | null = null;
  private status: PersistenceStatus = { mode: "memory", warning: null };
  private strummingPatterns: StrummingPatternRepository =
    new MemoryStrummingPatternRepository();

  async initialize(databaseName = "web-band"): Promise<PersistenceStatus> {
    this.initializePromise ??= this.openDatabase(databaseName);
    return this.initializePromise;
  }

  async deleteCustomChordProgression(progressionId: string): Promise<void> {
    if (this.database) {
      await this.database.transaction(
        "rw",
        this.database.chordProgressions,
        this.database.favoriteChordProgressions,
        async () => {
          await this.chordProgressions.delete(progressionId);
          await this.chordProgressionFavorites.remove(progressionId);
        },
      );
      return;
    }

    await this.chordProgressions.delete(progressionId);
    await this.chordProgressionFavorites.remove(progressionId);
  }

  async deleteCustomPattern(patternId: string): Promise<void> {
    if (this.database) {
      await this.database.transaction(
        "rw",
        this.database.customPatterns,
        this.database.favoritePatterns,
        async () => {
          await this.repository.delete(patternId);
          await this.favorites.remove(patternId);
        },
      );
      return;
    }

    await this.repository.delete(patternId);
    await this.favorites.remove(patternId);
  }

  async exportSnapshot(): Promise<PersistenceSnapshot> {
    const readSnapshot = async (): Promise<PersistenceSnapshot> => {
      const [
        customPatterns,
        favoritePatternIds,
        customChordProgressions,
        favoriteChordProgressionIds,
        customStrummingPatterns,
        practicePresets,
        practiceSessions,
      ] = await Promise.all([
        this.repository.list(),
        this.favorites.list(),
        this.chordProgressions.list(),
        this.chordProgressionFavorites.list(),
        this.strummingPatterns.list(),
        this.practicePresets.list(),
        this.practiceSessions.list(),
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
    const database = this.database;
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
          readSnapshot,
        )
      : await readSnapshot();

    return structuredClone(validatedSnapshot(snapshot));
  }

  async importSnapshot(
    snapshot: PersistenceSnapshot,
    mode: ImportMode,
  ): Promise<ImportSummary> {
    if (mode !== "merge" && mode !== "replace") {
      throw new Error("Import mode is invalid.");
    }

    const imported = structuredClone(snapshot);
    if (this.database) {
      await this.importIntoDatabase(imported, mode);
    } else {
      const nextSnapshot =
        mode === "merge"
          ? mergeSnapshots(await this.exportSnapshot(), imported)
          : imported;
      const repositories = createMemoryRepositories();
      await this.populateMemoryRepositories(repositories, nextSnapshot);
      this.assignMemoryRepositories(repositories);
    }

    return createImportSummary(imported, mode);
  }

  async recoverFromIndexedDbFailure(): Promise<PersistenceStatus> {
    if (this.status.mode !== "indexed-db") return this.status;
    if (this.recoveryPromise) return this.recoveryPromise;

    const recovery = this.switchToMemoryWithReadableData();
    this.recoveryPromise = recovery;
    try {
      return await recovery;
    } finally {
      if (this.recoveryPromise === recovery) this.recoveryPromise = null;
    }
  }

  private async switchToMemoryWithReadableData(): Promise<PersistenceStatus> {
    let snapshot: PersistenceSnapshot;
    try {
      snapshot = await this.exportSnapshot();
    } catch {
      snapshot = await this.readReadableSnapshot();
    }

    this.database?.close();
    this.database = null;
    const repositories = createMemoryRepositories();
    await this.populateMemoryRepositories(repositories, snapshot);
    this.assignMemoryRepositories(repositories);
    this.status = { mode: "memory", warning: STORAGE_WARNING };
    this.initializePromise = Promise.resolve(this.status);
    return this.status;
  }

  private async readReadableSnapshot(): Promise<PersistenceSnapshot> {
    const results = await Promise.allSettled([
      this.repository.list(),
      this.favorites.list(),
      this.chordProgressions.list(),
      this.chordProgressionFavorites.list(),
      this.strummingPatterns.list(),
      this.practicePresets.list(),
      this.practiceSessions.list(),
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

  private async importIntoDatabase(
    snapshot: PersistenceSnapshot,
    mode: ImportMode,
  ): Promise<void> {
    const database = this.database;
    if (!database) return;

    await database.transaction(
      "rw",
      [
        database.customPatterns,
        database.favoritePatterns,
        database.chordProgressions,
        database.favoriteChordProgressions,
        database.strummingPatterns,
        database.practicePresets,
        database.practiceSessions,
      ],
      async () => {
        if (mode === "replace") {
          await database.customPatterns.clear();
          await database.favoritePatterns.clear();
          await database.chordProgressions.clear();
          await database.favoriteChordProgressions.clear();
          await database.strummingPatterns.clear();
          await database.practicePresets.clear();
          await database.practiceSessions.clear();
        }

        const importedAt = new Date().toISOString();
        if (snapshot.customPatterns.length)
          await database.customPatterns.bulkPut(snapshot.customPatterns);
        if (snapshot.favoritePatternIds.length) {
          await database.favoritePatterns.bulkPut(
            snapshot.favoritePatternIds.map((patternId) => ({
              createdAt: importedAt,
              patternId,
            })),
          );
        }
        if (snapshot.customChordProgressions.length) {
          await database.chordProgressions.bulkPut(
            snapshot.customChordProgressions,
          );
        }
        if (snapshot.favoriteChordProgressionIds.length) {
          await database.favoriteChordProgressions.bulkPut(
            snapshot.favoriteChordProgressionIds.map((progressionId) => ({
              createdAt: importedAt,
              progressionId,
            })),
          );
        }
        if (snapshot.customStrummingPatterns.length) {
          await database.strummingPatterns.bulkPut(
            snapshot.customStrummingPatterns,
          );
        }
        if (snapshot.practicePresets.length)
          await database.practicePresets.bulkPut(snapshot.practicePresets);
        if (snapshot.practiceSessions.length)
          await database.practiceSessions.bulkPut(snapshot.practiceSessions);
      },
    );
  }

  private async populateMemoryRepositories(
    repositories: MemoryRepositories,
    snapshot: PersistenceSnapshot,
  ): Promise<void> {
    for (const pattern of snapshot.customPatterns)
      await repositories.patterns.put(pattern);
    for (const patternId of snapshot.favoritePatternIds)
      await repositories.favorites.add(patternId);
    for (const progression of snapshot.customChordProgressions)
      await repositories.chordProgressions.put(progression);
    for (const progressionId of snapshot.favoriteChordProgressionIds)
      await repositories.chordProgressionFavorites.add(progressionId);
    for (const pattern of snapshot.customStrummingPatterns)
      await repositories.strummingPatterns.put(pattern);
    for (const preset of snapshot.practicePresets)
      await repositories.practicePresets.put(preset);
    for (const session of snapshot.practiceSessions)
      await repositories.practiceSessions.put(session);
  }

  private async openDatabase(databaseName: string): Promise<PersistenceStatus> {
    if (typeof indexedDB === "undefined") {
      this.useFreshMemoryRepositories();
      this.status = { mode: "memory", warning: STORAGE_WARNING };
      return this.status;
    }

    try {
      this.database = new WebBandDatabase(databaseName);
      await this.database.open();
      this.repository = new DexiePatternRepository(
        this.database.customPatterns,
      );
      this.favorites = new DexieFavoriteRepository(
        this.database.favoritePatterns,
      );
      this.chordProgressions = new DexieChordProgressionRepository(
        this.database.chordProgressions,
      );
      this.chordProgressionFavorites =
        new DexieChordProgressionFavoriteRepository(
          this.database.favoriteChordProgressions,
        );
      this.practicePresets = new DexiePracticePresetRepository(
        this.database.practicePresets,
      );
      this.practiceSessions = new DexiePracticeSessionRepository(
        this.database.practiceSessions,
      );
      this.strummingPatterns = new DexieStrummingPatternRepository(
        this.database.strummingPatterns,
      );
      this.status = { mode: "indexed-db", warning: null };
    } catch {
      this.database?.close();
      this.database = null;
      this.useFreshMemoryRepositories();
      this.status = { mode: "memory", warning: STORAGE_WARNING };
    }

    return this.status;
  }

  get patternRepository(): PatternRepository {
    return this.repository;
  }

  get favoriteRepository(): FavoriteRepository {
    return this.favorites;
  }

  get chordProgressionRepository(): ChordProgressionRepository {
    return this.chordProgressions;
  }

  get chordProgressionFavoriteRepository(): ChordProgressionFavoriteRepository {
    return this.chordProgressionFavorites;
  }

  get practicePresetRepository(): PracticePresetRepository {
    return this.practicePresets;
  }

  get practiceSessionRepository(): PracticeSessionRepository {
    return this.practiceSessions;
  }

  get strummingPatternRepository(): StrummingPatternRepository {
    return this.strummingPatterns;
  }

  get currentStatus(): PersistenceStatus {
    return this.status;
  }

  private assignMemoryRepositories(repositories: MemoryRepositories): void {
    this.repository = repositories.patterns;
    this.favorites = repositories.favorites;
    this.chordProgressions = repositories.chordProgressions;
    this.chordProgressionFavorites = repositories.chordProgressionFavorites;
    this.practicePresets = repositories.practicePresets;
    this.practiceSessions = repositories.practiceSessions;
    this.strummingPatterns = repositories.strummingPatterns;
  }

  private useFreshMemoryRepositories(): void {
    this.assignMemoryRepositories(createMemoryRepositories());
  }

  close(): void {
    this.database?.close();
    this.database = null;
    this.initializePromise = null;
    this.recoveryPromise = null;
    this.useFreshMemoryRepositories();
    this.status = { mode: "memory", warning: null };
  }
}

export const storageService = new StorageService();
