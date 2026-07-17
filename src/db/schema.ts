import type { Table } from "dexie";

import type { DrumPattern } from "@/types/pattern";
import type {
  FavoritePatternRecord,
  PersistedEntity,
} from "@/types/persistence";

export interface WebBandTables {
  chordProgressions: Table<PersistedEntity, string>;
  customPatterns: Table<DrumPattern, string>;
  favoritePatterns: Table<FavoritePatternRecord, string>;
  practicePresets: Table<PersistedEntity, string>;
  practiceSessions: Table<PersistedEntity, string>;
  strummingPatterns: Table<PersistedEntity, string>;
}
