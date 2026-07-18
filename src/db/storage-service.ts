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
import type { PersistenceStatus } from "@/types/persistence";

const STORAGE_WARNING =
  "Local database storage is unavailable. Practice can continue, but new data will only last for this visit.";

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
  private repository: PatternRepository = new MemoryPatternRepository();
  private status: PersistenceStatus = { mode: "memory", warning: null };

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

  recoverFromRepositoryFailure(): PersistenceStatus {
    this.database?.close();
    this.database = null;
    this.useFreshMemoryRepositories();
    this.status = { mode: "memory", warning: STORAGE_WARNING };
    this.initializePromise = Promise.resolve(this.status);
    return this.status;
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

  get currentStatus(): PersistenceStatus {
    return this.status;
  }

  private useFreshMemoryRepositories(): void {
    this.repository = new MemoryPatternRepository();
    this.favorites = new MemoryFavoriteRepository();
    this.chordProgressions = new MemoryChordProgressionRepository();
    this.chordProgressionFavorites =
      new MemoryChordProgressionFavoriteRepository();
    this.practicePresets = new MemoryPracticePresetRepository();
  }

  close(): void {
    this.database?.close();
    this.database = null;
    this.initializePromise = null;
    this.useFreshMemoryRepositories();
    this.status = { mode: "memory", warning: null };
  }
}

export const storageService = new StorageService();
