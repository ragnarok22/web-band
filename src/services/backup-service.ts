import { clearOnboardingDismissal } from "@/db/repositories/onboarding-preferences-repository";
import { clearRecentPatternIds } from "@/db/repositories/pattern-preferences-repository";
import { defaultHistorySettings } from "@/db/repositories/history-settings-repository";
import { defaultPracticeSettings } from "@/db/repositories/settings-repository";
import { storageService, type StorageService } from "@/db/storage-service";
import { downloadBackupEnvelope } from "@/lib/backup-browser";
import {
  createBackupEnvelope,
  snapshotFromBackup,
} from "@/lib/backup-envelope";
import { validateBackupEnvelope } from "@/lib/persistence-validation";
import { useChordProgressionStore } from "@/stores/chord-progression-store";
import {
  createDefaultGuidedPracticeValues,
  useGuidedPracticeStore,
} from "@/stores/guided-practice-store";
import { useHistorySettingsStore } from "@/stores/history-settings-store";
import { usePatternStore } from "@/stores/pattern-store";
import { usePracticeHistoryStore } from "@/stores/practice-history-store";
import { usePracticePresetStore } from "@/stores/practice-preset-store";
import { usePracticeStore } from "@/stores/practice-store";
import type {
  BackupEnvelope,
  BackupSettings,
  ImportMode,
  ImportSummary,
  PersistenceSnapshot,
} from "@/types/persistence";

const emptySnapshot: PersistenceSnapshot = {
  customChordProgressions: [],
  customPatterns: [],
  customStrummingPatterns: [],
  favoriteChordProgressionIds: [],
  favoritePatternIds: [],
  practicePresets: [],
  practiceSessions: [],
};

type BackupStorage = Pick<
  StorageService,
  "exportSnapshot" | "importSnapshot" | "initialize"
>;

export interface BackupServiceDependencies {
  applySettings: (settings: BackupSettings) => boolean;
  clearAppPreferences: () => boolean;
  downloadEnvelope: (envelope: BackupEnvelope) => void;
  getSettings: () => BackupSettings;
  refreshStores: () => Promise<void>;
  storage: BackupStorage;
}

export interface BackupImportCompletion extends ImportSummary {
  settingsPersisted: boolean;
  warning: string | null;
}

export interface ClearLocalDataCompletion {
  cleared: true;
  settingsPersisted: boolean;
  warning: string | null;
}

function getCurrentSettings(): BackupSettings {
  const practice = usePracticeStore.getState();
  const guidedPractice = useGuidedPracticeStore.getState();
  const history = useHistorySettingsStore.getState();
  return structuredClone({
    guidedPractice: {
      chordTrainer: guidedPractice.chordTrainer,
      mode: guidedPractice.mode,
      strummingPattern: guidedPractice.strummingPattern,
      tempoTrainer: guidedPractice.tempoTrainer,
    },
    history: {
      enabled: history.enabled,
      minimumDurationSeconds: history.minimumDurationSeconds,
    },
    practice: {
      bpm: practice.bpm,
      countInMeasures: practice.countInMeasures,
      fillFrequency: practice.fillFrequency,
      humanization: practice.humanization,
      masterVolume: practice.masterVolume,
      mixer: practice.mixer,
      selectedPatternId: practice.selectedPatternId,
      swing: practice.swing,
      wakeLockEnabled: practice.wakeLockEnabled,
    },
  });
}

function applyCurrentSettings(settings: BackupSettings): boolean {
  const practiceSaved = usePracticeStore
    .getState()
    .replaceSettings(settings.practice);
  const guidedSaved = useGuidedPracticeStore
    .getState()
    .replaceSettings(settings.guidedPractice);
  const historySaved = useHistorySettingsStore
    .getState()
    .replaceSettings(settings.history);
  return practiceSaved && guidedSaved && historySaved;
}

async function refreshCurrentStores(): Promise<void> {
  await Promise.all([
    usePatternStore.getState().refreshAfterImport(),
    useChordProgressionStore.getState().refreshAfterImport(),
    usePracticePresetStore.getState().refreshAfterImport(),
    usePracticeHistoryStore.getState().refreshAfterImport(),
  ]);
}

function clearCurrentPreferences(): boolean {
  const recentPatternsCleared = clearRecentPatternIds();
  const onboardingCleared = clearOnboardingDismissal();
  return recentPatternsCleared && onboardingCleared;
}

const defaultDependencies: BackupServiceDependencies = {
  applySettings: applyCurrentSettings,
  clearAppPreferences: clearCurrentPreferences,
  downloadEnvelope: downloadBackupEnvelope,
  getSettings: getCurrentSettings,
  refreshStores: refreshCurrentStores,
  storage: storageService,
};

export class BackupService {
  constructor(private readonly dependencies = defaultDependencies) {}

  async createCurrentBackup(): Promise<BackupEnvelope> {
    await this.dependencies.storage.initialize();
    const snapshot = await this.dependencies.storage.exportSnapshot();
    return createBackupEnvelope(snapshot, this.dependencies.getSettings());
  }

  async exportCurrentBackup(): Promise<BackupEnvelope> {
    const envelope = await this.createCurrentBackup();
    this.dependencies.downloadEnvelope(envelope);
    return envelope;
  }

  async importBackup(
    value: unknown,
    mode: ImportMode,
  ): Promise<BackupImportCompletion> {
    if (mode !== "merge" && mode !== "replace") {
      throw new Error("Import mode is invalid.");
    }
    const validation = validateBackupEnvelope(value);
    if (!validation.success) {
      throw new Error(
        `This is not a valid Web Band backup. ${validation.errors[0] ?? "The backup is incomplete."}`,
      );
    }
    const envelope = structuredClone(value as BackupEnvelope);

    if (mode === "replace") await this.exportCurrentBackup();
    await this.dependencies.storage.initialize();
    const summary = await this.dependencies.storage.importSnapshot(
      snapshotFromBackup(envelope),
      mode,
    );
    const settingsPersisted = this.dependencies.applySettings(
      envelope.data.settings,
    );
    await this.dependencies.refreshStores();

    return {
      ...summary,
      settingsPersisted,
      warning: settingsPersisted
        ? null
        : "Your data was imported, but some app settings could not be saved for the next visit.",
    };
  }

  async clearAllLocalData(): Promise<ClearLocalDataCompletion> {
    await this.exportCurrentBackup();
    await this.dependencies.storage.initialize();
    await this.dependencies.storage.importSnapshot(emptySnapshot, "replace");
    const settingsPersisted = this.dependencies.applySettings({
      guidedPractice: createDefaultGuidedPracticeValues(),
      history: structuredClone(defaultHistorySettings),
      practice: structuredClone(defaultPracticeSettings),
    });
    const preferencesCleared = this.dependencies.clearAppPreferences();
    await this.dependencies.refreshStores();
    const persisted = settingsPersisted && preferencesCleared;
    return {
      cleared: true,
      settingsPersisted: persisted,
      warning: persisted
        ? null
        : "Local data was cleared, but some default settings could not be saved for the next visit.",
    };
  }
}

export const backupService = new BackupService();
