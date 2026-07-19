import type { EntityTable } from "dexie";

import {
  cloneValidRecords,
  type ReportCorruptRows,
} from "@/db/repositories/repository-helpers";
import { isCanonicalUtcIsoTimestamp } from "@/lib/timestamp-validation";
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
    record.patternId.length <= 128 &&
    isCanonicalUtcIsoTimestamp(record.createdAt)
  );
}

function assertPatternId(patternId: string): void {
  if (!patternId.trim() || patternId.length > 128) {
    throw new Error("Pattern ID is invalid.");
  }
}

export class DexieFavoriteRepository implements FavoriteRepository {
  constructor(
    private readonly table: EntityTable<FavoritePatternRecord, "patternId">,
    private readonly reportCorruptRows?: ReportCorruptRows,
  ) {}

  async add(patternId: string): Promise<void> {
    assertPatternId(patternId);
    await this.table.put({
      createdAt: new Date().toISOString(),
      patternId,
    });
  }

  async list(): Promise<string[]> {
    const records = await this.table.toArray();
    return cloneValidRecords(records, isFavoriteRecord, this.reportCorruptRows)
      .sort(
        (left, right) =>
          right.createdAt.localeCompare(left.createdAt) ||
          left.patternId.localeCompare(right.patternId),
      )
      .map((record) => record.patternId);
  }

  async remove(patternId: string): Promise<void> {
    assertPatternId(patternId);
    await this.table.delete(patternId);
  }
}

export class MemoryFavoriteRepository implements FavoriteRepository {
  private readonly patternIds = new Set<string>();

  async add(patternId: string): Promise<void> {
    assertPatternId(patternId);
    this.patternIds.add(patternId);
  }

  async list(): Promise<string[]> {
    return Array.from(this.patternIds).sort((left, right) =>
      left.localeCompare(right),
    );
  }

  async remove(patternId: string): Promise<void> {
    assertPatternId(patternId);
    this.patternIds.delete(patternId);
  }
}
