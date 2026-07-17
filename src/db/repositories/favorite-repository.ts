import type { EntityTable } from "dexie";

import type { FavoritePatternRecord } from "@/types/persistence";

export interface FavoriteRepository {
  add(patternId: string): Promise<void>;
  list(): Promise<string[]>;
  remove(patternId: string): Promise<void>;
}

export class DexieFavoriteRepository implements FavoriteRepository {
  constructor(
    private readonly table: EntityTable<FavoritePatternRecord, "patternId">,
  ) {}

  async add(patternId: string): Promise<void> {
    await this.table.put({
      createdAt: new Date().toISOString(),
      patternId,
    });
  }

  async list(): Promise<string[]> {
    const records = await this.table.orderBy("createdAt").reverse().toArray();
    return records.map((record) => record.patternId);
  }

  async remove(patternId: string): Promise<void> {
    await this.table.delete(patternId);
  }
}

export class MemoryFavoriteRepository implements FavoriteRepository {
  private readonly patternIds = new Set<string>();

  async add(patternId: string): Promise<void> {
    this.patternIds.add(patternId);
  }

  async list(): Promise<string[]> {
    return Array.from(this.patternIds);
  }

  async remove(patternId: string): Promise<void> {
    this.patternIds.delete(patternId);
  }
}
