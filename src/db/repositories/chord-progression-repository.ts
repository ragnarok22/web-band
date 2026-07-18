import type { EntityTable } from "dexie";

import { isCustomChordProgression } from "@/lib/practice-validation";
import type { CustomChordProgression } from "@/types/persistence";

export interface ChordProgressionRepository {
  delete(progressionId: string): Promise<void>;
  get(progressionId: string): Promise<CustomChordProgression | undefined>;
  list(): Promise<CustomChordProgression[]>;
  put(progression: CustomChordProgression): Promise<void>;
}

function assertProgressionId(progressionId: string): void {
  if (!progressionId.trim() || progressionId.length > 128) {
    throw new Error("Chord progression ID is invalid.");
  }
}

function sortProgressions(
  progressions: CustomChordProgression[],
): CustomChordProgression[] {
  return progressions.sort(
    (left, right) =>
      right.updatedAt.localeCompare(left.updatedAt) ||
      left.id.localeCompare(right.id),
  );
}

export class DexieChordProgressionRepository implements ChordProgressionRepository {
  constructor(
    private readonly table: EntityTable<CustomChordProgression, "id">,
  ) {}

  async delete(progressionId: string): Promise<void> {
    assertProgressionId(progressionId);
    await this.table.delete(progressionId);
  }

  async get(
    progressionId: string,
  ): Promise<CustomChordProgression | undefined> {
    assertProgressionId(progressionId);
    const progression = await this.table.get(progressionId);
    return progression && isCustomChordProgression(progression)
      ? structuredClone(progression)
      : undefined;
  }

  async list(): Promise<CustomChordProgression[]> {
    const progressions = await this.table.toArray();
    return sortProgressions(
      progressions
        .filter(isCustomChordProgression)
        .map((progression) => structuredClone(progression)),
    );
  }

  async put(progression: CustomChordProgression): Promise<void> {
    if (!isCustomChordProgression(progression)) {
      throw new Error("Only valid custom chord progressions can be saved.");
    }

    await this.table.put(structuredClone(progression));
  }
}

export class MemoryChordProgressionRepository implements ChordProgressionRepository {
  private readonly progressions = new Map<string, CustomChordProgression>();

  async delete(progressionId: string): Promise<void> {
    assertProgressionId(progressionId);
    this.progressions.delete(progressionId);
  }

  async get(
    progressionId: string,
  ): Promise<CustomChordProgression | undefined> {
    assertProgressionId(progressionId);
    const progression = this.progressions.get(progressionId);
    return progression && isCustomChordProgression(progression)
      ? structuredClone(progression)
      : undefined;
  }

  async list(): Promise<CustomChordProgression[]> {
    return sortProgressions(
      Array.from(this.progressions.values())
        .filter(isCustomChordProgression)
        .map((progression) => structuredClone(progression)),
    );
  }

  async put(progression: CustomChordProgression): Promise<void> {
    if (!isCustomChordProgression(progression)) {
      throw new Error("Only valid custom chord progressions can be saved.");
    }

    this.progressions.set(progression.id, structuredClone(progression));
  }
}
