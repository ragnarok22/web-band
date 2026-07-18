import type {
  CountInMeasures,
  FillFrequency,
  MixerSettings,
} from "@/types/audio";
import type {
  ChordProgression,
  GuidedPracticeConfiguration,
} from "@/types/practice";

export type PersistenceMode = "indexed-db" | "memory";

export interface PersistenceStatus {
  mode: PersistenceMode;
  warning: string | null;
}

export interface FavoritePatternRecord {
  patternId: string;
  createdAt: string;
}

export interface FavoriteChordProgressionRecord {
  progressionId: string;
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

export interface PracticePresetConfiguration {
  patternId: string;
  bpm: number;
  countInMeasures: CountInMeasures;
  swing: number;
  humanization: number;
  fillFrequency: FillFrequency;
  guidedPractice: GuidedPracticeConfiguration;
}

export interface PracticePreset {
  id: string;
  name: string;
  configuration: PracticePresetConfiguration;
  isFavorite: boolean;
  lastUsedAt: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface PracticePresetInput {
  name: string;
  configuration: PracticePresetConfiguration;
  isFavorite?: boolean;
}

export type CustomChordProgression = ChordProgression & {
  isBuiltIn: false;
  createdAt: string;
  updatedAt: string;
};
