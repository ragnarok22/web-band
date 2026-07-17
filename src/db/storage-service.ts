import { WebBandDatabase } from "@/db/database";
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
import type { PersistenceStatus } from "@/types/persistence";

const STORAGE_WARNING =
  "Local database storage is unavailable. Practice can continue, but new data will only last for this visit.";

export class StorageService {
  private database: WebBandDatabase | null = null;
  private favorites: FavoriteRepository = new MemoryFavoriteRepository();
  private initializePromise: Promise<PersistenceStatus> | null = null;
  private repository: PatternRepository = new MemoryPatternRepository();
  private status: PersistenceStatus = { mode: "memory", warning: null };

  async initialize(databaseName = "web-band"): Promise<PersistenceStatus> {
    this.initializePromise ??= this.openDatabase(databaseName);
    return this.initializePromise;
  }

  private async openDatabase(databaseName: string): Promise<PersistenceStatus> {
    if (typeof indexedDB === "undefined") {
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
      this.status = { mode: "indexed-db", warning: null };
    } catch {
      this.database?.close();
      this.database = null;
      this.repository = new MemoryPatternRepository();
      this.favorites = new MemoryFavoriteRepository();
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

  get currentStatus(): PersistenceStatus {
    return this.status;
  }

  close(): void {
    this.database?.close();
    this.database = null;
    this.initializePromise = null;
  }
}

export const storageService = new StorageService();
