import Dexie, { type EntityTable } from "dexie";

import type {
  CustomChordProgression,
  CustomDrumPattern,
  CustomStrummingPattern,
  FavoriteChordProgressionRecord,
  FavoritePatternRecord,
  PracticePreset,
  PracticeSession,
} from "@/types/persistence";

export class WebBandDatabase extends Dexie {
  chordProgressions!: EntityTable<CustomChordProgression, "id">;
  customPatterns!: EntityTable<CustomDrumPattern, "id">;
  favoriteChordProgressions!: EntityTable<
    FavoriteChordProgressionRecord,
    "progressionId"
  >;
  favoritePatterns!: EntityTable<FavoritePatternRecord, "patternId">;
  practicePresets!: EntityTable<PracticePreset, "id">;
  practiceSessions!: EntityTable<PracticeSession, "id">;
  strummingPatterns!: EntityTable<CustomStrummingPattern, "id">;

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

    this.version(2).stores({
      chordProgressions: "id, updatedAt",
      customPatterns: "id, category, difficulty, updatedAt",
      favoriteChordProgressions: "progressionId, createdAt",
      favoritePatterns: "patternId, createdAt",
      practicePresets: "id, updatedAt",
      practiceSessions: "id, createdAt, updatedAt",
      strummingPatterns: "id, updatedAt",
    });

    this.version(3).stores({
      chordProgressions: "id, updatedAt",
      customPatterns: "id, category, difficulty, updatedAt",
      favoriteChordProgressions: "progressionId, createdAt",
      favoritePatterns: "patternId, createdAt",
      practicePresets: "id, updatedAt",
      practiceSessions:
        "id, startedAt, patternId, practiceMode, createdAt, updatedAt",
      strummingPatterns: "id, updatedAt",
    });
  }
}
