import type { EntityTable } from "dexie";

import { isDrumPattern } from "@/lib/pattern-validation";
import type { DrumPattern } from "@/types/pattern";

export interface PatternRepository {
  delete(patternId: string): Promise<void>;
  get(patternId: string): Promise<DrumPattern | undefined>;
  list(): Promise<DrumPattern[]>;
  put(pattern: DrumPattern): Promise<void>;
}

export class DexiePatternRepository implements PatternRepository {
  constructor(private readonly table: EntityTable<DrumPattern, "id">) {}

  async delete(patternId: string): Promise<void> {
    await this.table.delete(patternId);
  }

  async get(patternId: string): Promise<DrumPattern | undefined> {
    const pattern = await this.table.get(patternId);
    return pattern && isDrumPattern(pattern) ? pattern : undefined;
  }

  async list(): Promise<DrumPattern[]> {
    const patterns = await this.table.toArray();
    return patterns.filter(isDrumPattern);
  }

  async put(pattern: DrumPattern): Promise<void> {
    if (!isDrumPattern(pattern) || pattern.isBuiltIn) {
      throw new Error("Only valid custom patterns can be saved.");
    }

    await this.table.put(pattern);
  }
}

export class MemoryPatternRepository implements PatternRepository {
  private readonly patterns = new Map<string, DrumPattern>();

  async delete(patternId: string): Promise<void> {
    this.patterns.delete(patternId);
  }

  async get(patternId: string): Promise<DrumPattern | undefined> {
    return this.patterns.get(patternId);
  }

  async list(): Promise<DrumPattern[]> {
    return Array.from(this.patterns.values());
  }

  async put(pattern: DrumPattern): Promise<void> {
    if (!isDrumPattern(pattern) || pattern.isBuiltIn) {
      throw new Error("Only valid custom patterns can be saved.");
    }

    this.patterns.set(pattern.id, structuredClone(pattern));
  }
}
