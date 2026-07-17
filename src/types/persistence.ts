export type PersistenceMode = "indexed-db" | "memory";

export interface PersistenceStatus {
  mode: PersistenceMode;
  warning: string | null;
}

export interface FavoritePatternRecord {
  patternId: string;
  createdAt: string;
}

export interface PersistedEntity {
  id: string;
  createdAt: string;
  updatedAt: string;
  data: unknown;
}

export interface PracticeSettings {
  bpm: number;
  masterVolume: number;
  selectedPatternId: string;
}
