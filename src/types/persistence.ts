import type {
  CountInMeasures,
  FillFrequency,
  MixerSettings,
} from "@/types/audio";

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
  countInMeasures: CountInMeasures;
  fillFrequency: FillFrequency;
  humanization: number;
  masterVolume: number;
  mixer: MixerSettings;
  selectedPatternId: string;
  swing: number;
  wakeLockEnabled: boolean;
}
