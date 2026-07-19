import type { EntityTable } from "dexie";

import {
  cloneValidRecords,
  type ReportCorruptRows,
} from "@/db/repositories/repository-helpers";
import { isCustomDrumPattern } from "@/lib/persistence-validation";
import type { CustomDrumPattern } from "@/types/persistence";

export interface PatternRepository {
  delete(patternId: string): Promise<void>;
  get(patternId: string): Promise<CustomDrumPattern | undefined>;
  list(): Promise<CustomDrumPattern[]>;
  put(pattern: CustomDrumPattern): Promise<void>;
}

function assertPatternId(patternId: string): void {
  if (!patternId.trim() || patternId.length > 128) {
    throw new Error("Pattern ID is invalid.");
  }
}

function sortPatterns(patterns: CustomDrumPattern[]): CustomDrumPattern[] {
  return patterns.sort(
    (left, right) =>
      right.updatedAt.localeCompare(left.updatedAt) ||
      left.id.localeCompare(right.id),
  );
}

export class DexiePatternRepository implements PatternRepository {
  constructor(
    private readonly table: EntityTable<CustomDrumPattern, "id">,
    private readonly reportCorruptRows?: ReportCorruptRows,
  ) {}

  async delete(patternId: string): Promise<void> {
    assertPatternId(patternId);
    await this.table.delete(patternId);
  }

  async get(patternId: string): Promise<CustomDrumPattern | undefined> {
    assertPatternId(patternId);
    const pattern = await this.table.get(patternId);
    return pattern && isCustomDrumPattern(pattern)
      ? structuredClone(pattern)
      : undefined;
  }

  async list(): Promise<CustomDrumPattern[]> {
    const patterns = await this.table.toArray();
    return sortPatterns(
      cloneValidRecords(patterns, isCustomDrumPattern, this.reportCorruptRows),
    );
  }

  async put(pattern: CustomDrumPattern): Promise<void> {
    if (!isCustomDrumPattern(pattern)) {
      throw new Error("Only valid custom patterns can be saved.");
    }

    await this.table.put(structuredClone(pattern));
  }
}

export class MemoryPatternRepository implements PatternRepository {
  private readonly patterns = new Map<string, CustomDrumPattern>();

  async delete(patternId: string): Promise<void> {
    assertPatternId(patternId);
    this.patterns.delete(patternId);
  }

  async get(patternId: string): Promise<CustomDrumPattern | undefined> {
    assertPatternId(patternId);
    const pattern = this.patterns.get(patternId);
    return pattern && isCustomDrumPattern(pattern)
      ? structuredClone(pattern)
      : undefined;
  }

  async list(): Promise<CustomDrumPattern[]> {
    return sortPatterns(
      cloneValidRecords(
        Array.from(this.patterns.values()),
        isCustomDrumPattern,
      ),
    );
  }

  async put(pattern: CustomDrumPattern): Promise<void> {
    if (!isCustomDrumPattern(pattern)) {
      throw new Error("Only valid custom patterns can be saved.");
    }

    this.patterns.set(pattern.id, structuredClone(pattern));
  }
}
