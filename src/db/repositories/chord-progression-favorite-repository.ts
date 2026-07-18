import type { EntityTable } from "dexie";

import { isCanonicalUtcIsoTimestamp } from "@/lib/timestamp-validation";
import type { FavoriteChordProgressionRecord } from "@/types/persistence";

export interface ChordProgressionFavoriteRepository {
  add(progressionId: string): Promise<void>;
  list(): Promise<string[]>;
  remove(progressionId: string): Promise<void>;
}

function isFavoriteRecord(
  value: unknown,
): value is FavoriteChordProgressionRecord {
  if (typeof value !== "object" || value === null || Array.isArray(value)) {
    return false;
  }

  const record = value as Record<string, unknown>;
  return (
    typeof record.progressionId === "string" &&
    record.progressionId.trim() !== "" &&
    record.progressionId.length <= 128 &&
    isCanonicalUtcIsoTimestamp(record.createdAt)
  );
}

function assertProgressionId(progressionId: string): void {
  if (!progressionId.trim() || progressionId.length > 128) {
    throw new Error("Chord progression ID is invalid.");
  }
}

function sortFavoriteRecords(
  records: FavoriteChordProgressionRecord[],
): FavoriteChordProgressionRecord[] {
  return records.sort(
    (left, right) =>
      right.createdAt.localeCompare(left.createdAt) ||
      left.progressionId.localeCompare(right.progressionId),
  );
}

export class DexieChordProgressionFavoriteRepository implements ChordProgressionFavoriteRepository {
  constructor(
    private readonly table: EntityTable<
      FavoriteChordProgressionRecord,
      "progressionId"
    >,
  ) {}

  async add(progressionId: string): Promise<void> {
    assertProgressionId(progressionId);
    const record: FavoriteChordProgressionRecord = {
      createdAt: new Date().toISOString(),
      progressionId,
    };
    if (!isFavoriteRecord(record)) {
      throw new Error("Chord progression favorite is invalid.");
    }
    await this.table.put(record);
  }

  async list(): Promise<string[]> {
    const records = await this.table.toArray();
    return sortFavoriteRecords(records.filter(isFavoriteRecord)).map(
      (record) => record.progressionId,
    );
  }

  async remove(progressionId: string): Promise<void> {
    assertProgressionId(progressionId);
    await this.table.delete(progressionId);
  }
}

export class MemoryChordProgressionFavoriteRepository implements ChordProgressionFavoriteRepository {
  private readonly records = new Map<string, FavoriteChordProgressionRecord>();

  async add(progressionId: string): Promise<void> {
    assertProgressionId(progressionId);
    const record: FavoriteChordProgressionRecord = {
      createdAt: new Date().toISOString(),
      progressionId,
    };
    if (!isFavoriteRecord(record)) {
      throw new Error("Chord progression favorite is invalid.");
    }
    this.records.set(progressionId, structuredClone(record));
  }

  async list(): Promise<string[]> {
    const progressionIds: string[] = [];
    for (const record of this.records.values()) {
      if (isFavoriteRecord(record)) progressionIds.push(record.progressionId);
    }
    return progressionIds.sort((left, right) => left.localeCompare(right));
  }

  async remove(progressionId: string): Promise<void> {
    assertProgressionId(progressionId);
    this.records.delete(progressionId);
  }
}
