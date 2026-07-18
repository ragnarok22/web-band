import type { EntityTable } from "dexie";

import { isCanonicalUtcIsoTimestamp } from "@/lib/persistence-validation";
import type { FavoritePatternRecord } from "@/types/persistence";

export interface FavoriteRepository {
  add(patternId: string): Promise<void>;
  list(): Promise<string[]>;
  remove(patternId: string): Promise<void>;
}

function isFavoriteRecord(value: unknown): value is FavoritePatternRecord {
  if (typeof value !== "object" || value === null || Array.isArray(value)) {
    return false;
  }

  const record = value as Record<string, unknown>;
  return (
    typeof record.patternId === "string" &&
    record.patternId.trim() !== "" &&
    isCanonicalUtcIsoTimestamp(record.createdAt)
  );
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
    const records = await this.table.toArray();
    return records
      .filter(isFavoriteRecord)
      .sort(
        (left, right) =>
          right.createdAt.localeCompare(left.createdAt) ||
          left.patternId.localeCompare(right.patternId),
      )
      .map((record) => record.patternId);
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
