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
  MetronomeConfiguration,
  MetronomeSubdivision,
  PatternGuidedPracticeConfiguration,
} from "@/types/practice";
import type { DrumPattern } from "@/types/pattern";

export type PersistenceMode = "indexed-db" | "memory";
export type ColorTheme = "dark" | "light" | "system";
export type BeatFlashIntensity = "minimal" | "standard" | "strong";
export type BpmAdjustmentStep = 1 | 5;
export type VisualSubdivisionDetail = "beats" | "pattern" | "sixteenths";

export interface AppearancePreferences {
  beatFlashIntensity: BeatFlashIntensity;
  reducedMotion: boolean;
  theme: ColorTheme;
  visualSubdivisionDetail: VisualSubdivisionDetail;
}

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
  bpmAdjustmentStep: BpmAdjustmentStep;
  countInMeasures: CountInMeasures;
  fillFrequency: FillFrequency;
  humanization: number;
  masterVolume: number;
  mixer: MixerSettings;
  restoreLastPractice: boolean;
  selectedPatternId: string;
  soundCharacter: SoundCharacter;
  swing: number;
  wakeLockEnabled: boolean;
}

export interface GuidedPracticeSettings {
  metronome: MetronomeConfiguration;
  mode: PracticeMode;
  tempoTrainer: TempoTrainerConfiguration;
  chordTrainer: ChordTrainerConfiguration;
  strummingPattern: StrummingPattern;
}

export type GuidedPracticeSettingsV1 = Omit<
  GuidedPracticeSettings,
  "metronome" | "mode"
> & { mode: Exclude<PracticeMode, "metronome"> };

export interface HistorySettings {
  enabled: boolean;
  minimumDurationSeconds: number;
}

export interface PatternPracticePresetConfiguration {
  patternId: string;
  bpm: number;
  countInMeasures: CountInMeasures;
  swing: number;
  humanization: number;
  fillFrequency: FillFrequency;
  guidedPractice: PatternGuidedPracticeConfiguration;
}

export interface MetronomePracticePresetConfiguration {
  bpm: number;
  countInMeasures: CountInMeasures;
  guidedPractice: Extract<GuidedPracticeConfiguration, { mode: "metronome" }>;
  patternId?: never;
  swing?: never;
  humanization?: never;
  fillFrequency?: never;
}

export type PracticePresetConfiguration =
  PatternPracticePresetConfiguration | MetronomePracticePresetConfiguration;

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

interface PracticeSessionBase {
  id: string;
  startedAt: string;
  endedAt: string;
  durationSeconds: number;
  startingBpm: number;
  endingBpm: number;
  timeSignature: string;
  createdAt: string;
  updatedAt: string;
}

export interface PatternPracticeSession extends PracticeSessionBase {
  practiceMode: Exclude<PracticeMode, "metronome">;
  patternId: string;
  patternName: string;
  category: string;
}

export interface MetronomePracticeSession extends PracticeSessionBase {
  practiceMode: "metronome";
  metronome: {
    trainingMode: "manual" | "progressive";
    subdivision: MetronomeSubdivision;
  };
  patternId?: never;
  patternName?: never;
  category?: never;
}

export type PracticeSession = PatternPracticeSession | MetronomePracticeSession;

export interface PersistenceSnapshot {
  customPatterns: CustomDrumPattern[];
  favoritePatternIds: string[];
  customChordProgressions: CustomChordProgression[];
  favoriteChordProgressionIds: string[];
  customStrummingPatterns: CustomStrummingPattern[];
  practicePresets: PracticePreset[];
  practiceSessions: PracticeSession[];
}

interface PersistenceSnapshotV1 extends Omit<
  PersistenceSnapshot,
  "practicePresets" | "practiceSessions"
> {
  practicePresets: Array<
    Omit<PracticePreset, "configuration"> & {
      configuration: PatternPracticePresetConfiguration;
    }
  >;
  practiceSessions: PatternPracticeSession[];
}

export interface BackupSettings {
  practice: PracticeSettings;
  guidedPractice: GuidedPracticeSettings;
  history: HistorySettings;
}

export interface BackupPreferences {
  appearance: AppearancePreferences;
  onboardingDismissed: boolean;
  recentPatternIds: string[];
}

export interface PracticeSettingsV1 {
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

export interface PracticeSettingsV2 extends PracticeSettingsV1 {
  soundCharacter: SoundCharacter;
}

export type PracticeSettingsV3 = PracticeSettingsV2;

export interface AppearancePreferencesV1 {
  reducedMotion: boolean;
  theme: ColorTheme;
}

export interface BackupPreferencesV3 {
  appearance: AppearancePreferencesV1;
  onboardingDismissed: boolean;
  recentPatternIds: string[];
}

export interface BackupSettingsV1 {
  practice: PracticeSettingsV1;
  guidedPractice: GuidedPracticeSettingsV1;
  history: HistorySettings;
}

export interface BackupDataV1 extends PersistenceSnapshotV1 {
  settings: BackupSettingsV1;
}

export interface BackupEnvelopeV1 {
  app: "web-band";
  version: 1;
  exportedAt: string;
  data: BackupDataV1;
}

export interface BackupDataV2 extends PersistenceSnapshotV1 {
  settings: Omit<BackupSettingsV1, "practice"> & {
    practice: PracticeSettingsV2;
  };
}

export interface BackupEnvelopeV2 {
  app: "web-band";
  version: 2;
  exportedAt: string;
  data: BackupDataV2;
}

export interface BackupDataV3 extends PersistenceSnapshotV1 {
  preferences: BackupPreferencesV3;
  settings: Omit<BackupSettingsV1, "practice"> & {
    practice: PracticeSettingsV3;
  };
}

export interface BackupEnvelopeV3 {
  app: "web-band";
  version: 3;
  exportedAt: string;
  data: BackupDataV3;
}

export interface BackupDataV4 extends PersistenceSnapshotV1 {
  preferences: BackupPreferences;
  settings: Omit<BackupSettingsV1, "practice"> & { practice: PracticeSettings };
}

export interface BackupEnvelopeV4 {
  app: "web-band";
  version: 4;
  exportedAt: string;
  data: BackupDataV4;
}

export interface BackupEnvelopeV5 {
  app: "web-band";
  version: 5;
  exportedAt: string;
  data: PersistenceSnapshot & {
    preferences: BackupPreferences;
    settings: BackupSettings;
  };
}

export type BackupEnvelope = BackupEnvelopeV5;
export type VersionedBackupEnvelope =
  | BackupEnvelopeV1
  | BackupEnvelopeV2
  | BackupEnvelopeV3
  | BackupEnvelopeV4
  | BackupEnvelopeV5;

export type ImportMode = "merge" | "replace";

export type ImportCollectionCounts = {
  [Key in keyof PersistenceSnapshot]: number;
};

export interface ImportSummary {
  mode: ImportMode;
  imported: ImportCollectionCounts;
  totalImported: number;
}
