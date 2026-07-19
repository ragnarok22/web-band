import type { EntityTable } from "dexie";

import {
  cloneValidRecords,
  type ReportCorruptRows,
} from "@/db/repositories/repository-helpers";
import { isPracticePreset } from "@/lib/practice-validation";
import type { PracticePreset } from "@/types/persistence";

export interface PracticePresetRepository {
  delete(presetId: string): Promise<void>;
  get(presetId: string): Promise<PracticePreset | undefined>;
  list(): Promise<PracticePreset[]>;
  put(preset: PracticePreset): Promise<void>;
}

function assertPresetId(presetId: string): void {
  if (!presetId.trim() || presetId.length > 128) {
    throw new Error("Practice preset ID is invalid.");
  }
}

function sortPresets(presets: PracticePreset[]): PracticePreset[] {
  return presets.sort(
    (left, right) =>
      right.updatedAt.localeCompare(left.updatedAt) ||
      left.id.localeCompare(right.id),
  );
}

export class DexiePracticePresetRepository implements PracticePresetRepository {
  constructor(
    private readonly table: EntityTable<PracticePreset, "id">,
    private readonly reportCorruptRows?: ReportCorruptRows,
  ) {}

  async delete(presetId: string): Promise<void> {
    assertPresetId(presetId);
    await this.table.delete(presetId);
  }

  async get(presetId: string): Promise<PracticePreset | undefined> {
    assertPresetId(presetId);
    const preset = await this.table.get(presetId);
    return preset && isPracticePreset(preset)
      ? structuredClone(preset)
      : undefined;
  }

  async list(): Promise<PracticePreset[]> {
    const presets = await this.table.toArray();
    return sortPresets(
      cloneValidRecords(presets, isPracticePreset, this.reportCorruptRows),
    );
  }

  async put(preset: PracticePreset): Promise<void> {
    if (!isPracticePreset(preset)) {
      throw new Error("Only valid practice presets can be saved.");
    }

    await this.table.put(structuredClone(preset));
  }
}

export class MemoryPracticePresetRepository implements PracticePresetRepository {
  private readonly presets = new Map<string, PracticePreset>();

  async delete(presetId: string): Promise<void> {
    assertPresetId(presetId);
    this.presets.delete(presetId);
  }

  async get(presetId: string): Promise<PracticePreset | undefined> {
    assertPresetId(presetId);
    const preset = this.presets.get(presetId);
    return preset && isPracticePreset(preset)
      ? structuredClone(preset)
      : undefined;
  }

  async list(): Promise<PracticePreset[]> {
    return sortPresets(
      cloneValidRecords(Array.from(this.presets.values()), isPracticePreset),
    );
  }

  async put(preset: PracticePreset): Promise<void> {
    if (!isPracticePreset(preset)) {
      throw new Error("Only valid practice presets can be saved.");
    }

    this.presets.set(preset.id, structuredClone(preset));
  }
}
