import type { EntityTable } from "dexie";

import { cloneValidRecords } from "@/db/repositories/repository-helpers";
import { isCustomStrummingPattern } from "@/lib/persistence-validation";
import type { CustomStrummingPattern } from "@/types/persistence";

export interface StrummingPatternRepository {
  delete(patternId: string): Promise<void>;
  get(patternId: string): Promise<CustomStrummingPattern | undefined>;
  list(): Promise<CustomStrummingPattern[]>;
  put(pattern: CustomStrummingPattern): Promise<void>;
}

function assertPatternId(patternId: string): void {
  if (!patternId.trim() || patternId.length > 128) {
    throw new Error("Strumming pattern ID is invalid.");
  }
}

function sortPatterns(
  patterns: CustomStrummingPattern[],
): CustomStrummingPattern[] {
  return patterns.sort(
    (left, right) =>
      right.updatedAt.localeCompare(left.updatedAt) ||
      left.id.localeCompare(right.id),
  );
}

export class DexieStrummingPatternRepository implements StrummingPatternRepository {
  constructor(
    private readonly table: EntityTable<CustomStrummingPattern, "id">,
  ) {}

  async delete(patternId: string): Promise<void> {
    assertPatternId(patternId);
    await this.table.delete(patternId);
  }

  async get(patternId: string): Promise<CustomStrummingPattern | undefined> {
    assertPatternId(patternId);
    const pattern = await this.table.get(patternId);
    return pattern && isCustomStrummingPattern(pattern)
      ? structuredClone(pattern)
      : undefined;
  }

  async list(): Promise<CustomStrummingPattern[]> {
    const patterns = await this.table.toArray();
    return sortPatterns(cloneValidRecords(patterns, isCustomStrummingPattern));
  }

  async put(pattern: CustomStrummingPattern): Promise<void> {
    if (!isCustomStrummingPattern(pattern)) {
      throw new Error("Only valid custom strumming patterns can be saved.");
    }
    await this.table.put(structuredClone(pattern));
  }
}

export class MemoryStrummingPatternRepository implements StrummingPatternRepository {
  private readonly patterns = new Map<string, CustomStrummingPattern>();

  async delete(patternId: string): Promise<void> {
    assertPatternId(patternId);
    this.patterns.delete(patternId);
  }

  async get(patternId: string): Promise<CustomStrummingPattern | undefined> {
    assertPatternId(patternId);
    const pattern = this.patterns.get(patternId);
    return pattern && isCustomStrummingPattern(pattern)
      ? structuredClone(pattern)
      : undefined;
  }

  async list(): Promise<CustomStrummingPattern[]> {
    return sortPatterns(
      cloneValidRecords(
        Array.from(this.patterns.values()),
        isCustomStrummingPattern,
      ),
    );
  }

  async put(pattern: CustomStrummingPattern): Promise<void> {
    if (!isCustomStrummingPattern(pattern)) {
      throw new Error("Only valid custom strumming patterns can be saved.");
    }
    this.patterns.set(pattern.id, structuredClone(pattern));
  }
}
