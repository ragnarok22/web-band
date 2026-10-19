import { WebBandDatabase } from "@/db/database";
import type {
  CorruptRowCounts,
  IndexedDbCollection,
} from "@/db/repositories/repository-helpers";
import {
  createIndexedDbRepositories,
  createMemoryRepositories,
  populateMemoryRepositories,
} from "@/db/storage/repositories";
import {
  createImportSummary,
  mergeSnapshots,
  readReadableSnapshot,
  readSnapshot,
} from "@/db/storage/snapshot";
import { importIntoDatabase } from "@/db/storage/import-snapshot";
import { isCustomDrumPattern } from "@/lib/persistence-validation";
import type {
  CustomDrumPattern,
  ImportMode,
  ImportSummary,
  PersistenceSnapshot,
  PersistenceStatus,
} from "@/types/persistence";

const STORAGE_WARNING =
  "Local database storage is unavailable. Practice can continue, but new data will only last for this visit.";
type CorruptRowsListener = (counts: CorruptRowCounts) => void;

export class StorageService {
  private repositories = createMemoryRepositories();
  private corruptRowCounts: CorruptRowCounts = {};
  private readonly corruptRowsListeners = new Set<CorruptRowsListener>();
  private database: WebBandDatabase | null = null;
  private initializePromise: Promise<PersistenceStatus> | null = null;
  private recoveryPromise: Promise<PersistenceStatus> | null = null;
  private status: PersistenceStatus = { mode: "memory", warning: null };

  async initialize(databaseName = "web-band"): Promise<PersistenceStatus> {
    this.initializePromise ??= this.openDatabase(databaseName);
    return this.initializePromise;
  }

  subscribeToCorruptRows(listener: CorruptRowsListener): () => void {
    this.corruptRowsListeners.add(listener);
    listener({ ...this.corruptRowCounts });
    return () => this.corruptRowsListeners.delete(listener);
  }

  async deleteCustomChordProgression(progressionId: string): Promise<void> {
    if (this.database) {
      await this.database.transaction(
        "rw",
        this.database.chordProgressions,
        this.database.favoriteChordProgressions,
        async () => {
          await this.repositories.chordProgressions.delete(progressionId);
          await this.repositories.chordProgressionFavorites.remove(
            progressionId,
          );
        },
      );
      return;
    }
    await this.repositories.chordProgressions.delete(progressionId);
    await this.repositories.chordProgressionFavorites.remove(progressionId);
  }

  async deleteCustomPattern(patternId: string): Promise<void> {
    if (this.database) {
      await this.database.transaction(
        "rw",
        this.database.customPatterns,
        this.database.favoritePatterns,
        async () => {
          await this.repositories.patterns.delete(patternId);
          await this.repositories.favorites.remove(patternId);
        },
      );
      return;
    }
    await this.repositories.patterns.delete(patternId);
    await this.repositories.favorites.remove(patternId);
  }

  async exportSnapshot(): Promise<PersistenceSnapshot> {
    return readSnapshot(this.repositories, this.database);
  }

  async importSnapshot(
    snapshot: PersistenceSnapshot,
    mode: ImportMode,
  ): Promise<ImportSummary> {
    if (mode !== "merge" && mode !== "replace")
      throw new Error("Import mode is invalid.");
    const imported = structuredClone(snapshot);
    if (this.database) {
      await importIntoDatabase(this.database, imported, mode);
    } else {
      const nextSnapshot =
        mode === "merge"
          ? mergeSnapshots(await this.exportSnapshot(), imported)
          : imported;
      const repositories = createMemoryRepositories();
      await populateMemoryRepositories(repositories, nextSnapshot);
      this.repositories = repositories;
    }
    return createImportSummary(imported, mode);
  }

  async putCustomPatterns(
    patterns: readonly CustomDrumPattern[],
  ): Promise<void> {
    const imported = structuredClone([...patterns]);
    if (
      imported.length === 0 ||
      !imported.every(isCustomDrumPattern) ||
      new Set(imported.map(({ id }) => id)).size !== imported.length
    ) {
      throw new Error("Only unique, valid custom patterns can be imported.");
    }
    if (this.database) {
      await this.database.transaction("rw", this.database.customPatterns, () =>
        this.database!.customPatterns.bulkPut(imported),
      );
      return;
    }
    await Promise.all(
      imported.map((pattern) => this.repositories.patterns.put(pattern)),
    );
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
      snapshot = await readReadableSnapshot(this.repositories);
    }
    this.database?.close();
    this.database = null;
    const repositories = createMemoryRepositories();
    await populateMemoryRepositories(repositories, snapshot);
    this.repositories = repositories;
    this.status = { mode: "memory", warning: STORAGE_WARNING };
    this.initializePromise = Promise.resolve(this.status);
    return this.status;
  }

  private async openDatabase(databaseName: string): Promise<PersistenceStatus> {
    this.replaceCorruptRowCounts({});
    if (typeof indexedDB === "undefined") {
      this.repositories = createMemoryRepositories();
      this.status = { mode: "memory", warning: STORAGE_WARNING };
      return this.status;
    }
    try {
      this.database = new WebBandDatabase(databaseName);
      await this.database.open();
      this.repositories = createIndexedDbRepositories(
        this.database,
        (collection, count) => this.reportCorruptRows(collection, count),
      );
      this.status = { mode: "indexed-db", warning: null };
    } catch {
      this.database?.close();
      this.database = null;
      this.repositories = createMemoryRepositories();
      this.status = { mode: "memory", warning: STORAGE_WARNING };
    }
    return this.status;
  }

  get patternRepository() {
    return this.repositories.patterns;
  }
  get favoriteRepository() {
    return this.repositories.favorites;
  }
  get chordProgressionRepository() {
    return this.repositories.chordProgressions;
  }
  get chordProgressionFavoriteRepository() {
    return this.repositories.chordProgressionFavorites;
  }
  get practicePresetRepository() {
    return this.repositories.practicePresets;
  }
  get practiceSessionRepository() {
    return this.repositories.practiceSessions;
  }
  get strummingPatternRepository() {
    return this.repositories.strummingPatterns;
  }
  get currentStatus(): PersistenceStatus {
    return this.status;
  }
  get currentCorruptRowCounts(): CorruptRowCounts {
    return { ...this.corruptRowCounts };
  }

  private reportCorruptRows(
    collection: IndexedDbCollection,
    count: number,
  ): void {
    const nextCounts = { ...this.corruptRowCounts };
    if (count > 0) nextCounts[collection] = count;
    else delete nextCounts[collection];
    this.replaceCorruptRowCounts(nextCounts);
  }

  private replaceCorruptRowCounts(counts: CorruptRowCounts): void {
    const currentEntries = Object.entries(this.corruptRowCounts);
    const nextEntries = Object.entries(counts);
    if (
      currentEntries.length === nextEntries.length &&
      nextEntries.every(
        ([collection, count]) =>
          this.corruptRowCounts[collection as IndexedDbCollection] === count,
      )
    )
      return;
    this.corruptRowCounts = { ...counts };
    for (const listener of this.corruptRowsListeners) {
      try {
        listener({ ...this.corruptRowCounts });
      } catch {
        // Diagnostics must not turn readable data into a storage failure.
      }
    }
  }

  close(): void {
    this.database?.close();
    this.database = null;
    this.initializePromise = null;
    this.recoveryPromise = null;
    this.repositories = createMemoryRepositories();
    this.status = { mode: "memory", warning: null };
    this.replaceCorruptRowCounts({});
  }
}

export const storageService = new StorageService();
