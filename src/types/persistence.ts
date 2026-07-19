import type {
  CountInMeasures,
  FillFrequency,
  MixerSettings,
  SoundCharacter,
} from "@/types/audio";
import type {
  ChordProgression,
  ChordTrainerConfiguration,
  GuidedPracticeConfiguration,
  PracticeMode,
  StrummingPattern,
  TempoTrainerConfiguration,
} from "@/types/practice";
import type { DrumPattern } from "@/types/pattern";

export type PersistenceMode = "indexed-db" | "memory";

export interface PersistenceStatus {
  mode: PersistenceMode;
  warning: string | null;
}

export type CustomDrumPattern = DrumPattern & {
  isBuiltIn: false;
  createdAt: string;
  updatedAt: string;
};

export type CustomStrummingPattern = StrummingPattern & {
  isBuiltIn: false;
  createdAt: string;
  updatedAt: string;
};

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
  soundCharacter: SoundCharacter;
  swing: number;
  wakeLockEnabled: boolean;
}

export interface GuidedPracticeSettings {
  mode: PracticeMode;
  tempoTrainer: TempoTrainerConfiguration;
  chordTrainer: ChordTrainerConfiguration;
  strummingPattern: StrummingPattern;
}

export interface HistorySettings {
  enabled: boolean;
  minimumDurationSeconds: number;
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

export interface PracticeSession {
  id: string;
  startedAt: string;
  endedAt: string;
  durationSeconds: number;
  patternId: string;
  patternName: string;
  category: string;
  startingBpm: number;
  endingBpm: number;
  timeSignature: string;
  practiceMode: PracticeMode;
  createdAt: string;
  updatedAt: string;
}

export interface PersistenceSnapshot {
  customPatterns: CustomDrumPattern[];
  favoritePatternIds: string[];
  customChordProgressions: CustomChordProgression[];
  favoriteChordProgressionIds: string[];
  customStrummingPatterns: CustomStrummingPattern[];
  practicePresets: PracticePreset[];
  practiceSessions: PracticeSession[];
}

export interface BackupSettings {
  practice: PracticeSettings;
  guidedPractice: GuidedPracticeSettings;
  history: HistorySettings;
}

export type PracticeSettingsV1 = Omit<PracticeSettings, "soundCharacter">;

export interface BackupSettingsV1 {
  practice: PracticeSettingsV1;
  guidedPractice: GuidedPracticeSettings;
  history: HistorySettings;
}

export interface BackupDataV1 extends PersistenceSnapshot {
  settings: BackupSettingsV1;
}

export interface BackupEnvelopeV1 {
  app: "web-band";
  version: 1;
  exportedAt: string;
  data: BackupDataV1;
}

export interface BackupDataV2 extends PersistenceSnapshot {
  settings: BackupSettings;
}

export interface BackupEnvelopeV2 {
  app: "web-band";
  version: 2;
  exportedAt: string;
  data: BackupDataV2;
}

export type BackupEnvelope = BackupEnvelopeV2;
export type VersionedBackupEnvelope = BackupEnvelopeV1 | BackupEnvelopeV2;

export type ImportMode = "merge" | "replace";

export type ImportCollectionCounts = {
  [Key in keyof PersistenceSnapshot]: number;
};

export interface ImportSummary {
  mode: ImportMode;
  imported: ImportCollectionCounts;
  totalImported: number;
}
