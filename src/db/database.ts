import Dexie, { type EntityTable } from "dexie";

import type { DrumPattern } from "@/types/pattern";
import type {
  FavoritePatternRecord,
  PersistedEntity,
} from "@/types/persistence";

export class WebBandDatabase extends Dexie {
  chordProgressions!: EntityTable<PersistedEntity, "id">;
  customPatterns!: EntityTable<DrumPattern, "id">;
  favoritePatterns!: EntityTable<FavoritePatternRecord, "patternId">;
  practicePresets!: EntityTable<PersistedEntity, "id">;
  practiceSessions!: EntityTable<PersistedEntity, "id">;
  strummingPatterns!: EntityTable<PersistedEntity, "id">;

  constructor(name = "web-band") {
    super(name);

    this.version(1).stores({
      chordProgressions: "id, updatedAt",
      customPatterns: "id, category, difficulty, updatedAt",
      favoritePatterns: "patternId, createdAt",
      practicePresets: "id, updatedAt",
      practiceSessions: "id, createdAt, updatedAt",
      strummingPatterns: "id, updatedAt",
    });
  }
}
