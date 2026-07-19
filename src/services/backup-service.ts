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
import { executeStorageOperation } from "@/lib/storage-execution";
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
import { useStrummingPatternStore } from "@/stores/strumming-pattern-store";
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
  clearRecentPatterns: () => boolean;
  downloadEnvelope: (envelope: BackupEnvelope) => void;
  executeStorageOperation: <T>(operation: () => Promise<T>) => Promise<T>;
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
  const operations = [
    () => usePracticeStore.getState().replaceSettings(settings.practice),
    () =>
      useGuidedPracticeStore
        .getState()
        .replaceSettings(settings.guidedPractice),
    () => useHistorySettingsStore.getState().replaceSettings(settings.history),
  ];
  let persisted = true;
  for (const operation of operations) {
    try {
      persisted = operation() && persisted;
    } catch {
      persisted = false;
    }
  }
  return persisted;
}

async function refreshCurrentStores(): Promise<void> {
  const results = await Promise.allSettled([
    usePatternStore.getState().refreshAfterImport(),
    useChordProgressionStore.getState().refreshAfterImport(),
    usePracticePresetStore.getState().refreshAfterImport(),
    usePracticeHistoryStore.getState().refreshAfterImport(),
    useStrummingPatternStore.getState().refreshAfterImport(),
  ]);
  if (results.some(({ status }) => status === "rejected")) {
    throw new Error("Some stores could not be refreshed.");
  }
}

function clearCurrentPreferences(): boolean {
  const recentPatternsCleared = clearRecentPatternIds();
  const onboardingCleared = clearOnboardingDismissal();
  return recentPatternsCleared && onboardingCleared;
}

const defaultDependencies: BackupServiceDependencies = {
  applySettings: applyCurrentSettings,
  clearAppPreferences: clearCurrentPreferences,
  clearRecentPatterns: clearRecentPatternIds,
  downloadEnvelope: downloadBackupEnvelope,
  executeStorageOperation,
  getSettings: getCurrentSettings,
  refreshStores: refreshCurrentStores,
  storage: storageService,
};

export class BackupService {
  constructor(private readonly dependencies = defaultDependencies) {}

  async createCurrentBackup(): Promise<BackupEnvelope> {
    const snapshot = await this.dependencies.executeStorageOperation(() =>
      this.dependencies.storage.exportSnapshot(),
    );
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
    const summary = await this.dependencies.executeStorageOperation(() =>
      this.dependencies.storage.importSnapshot(
        snapshotFromBackup(envelope),
        mode,
      ),
    );
    const issues: string[] = [];
    if (mode === "replace") {
      try {
        if (!this.dependencies.clearRecentPatterns()) {
          issues.push("recent pattern preferences could not be cleared");
        }
      } catch {
        issues.push("recent pattern preferences could not be cleared");
      }
    }

    let settingsPersisted = false;
    try {
      settingsPersisted = this.dependencies.applySettings(
        envelope.data.settings,
      );
    } catch {
      settingsPersisted = false;
    }
    if (!settingsPersisted) {
      issues.push("some app settings could not be saved for the next visit");
    }
    try {
      await this.dependencies.refreshStores();
    } catch {
      issues.push("app data could not be fully refreshed");
    }

    return {
      ...summary,
      settingsPersisted,
      warning:
        issues.length === 0
          ? null
          : `Your data was imported, but ${issues.join("; ")}.`,
    };
  }

  async clearAllLocalData(): Promise<ClearLocalDataCompletion> {
    await this.exportCurrentBackup();
    await this.dependencies.executeStorageOperation(() =>
      this.dependencies.storage.importSnapshot(emptySnapshot, "replace"),
    );
    const issues: string[] = [];
    let settingsPersisted = false;
    try {
      settingsPersisted = this.dependencies.applySettings({
        guidedPractice: createDefaultGuidedPracticeValues(),
        history: structuredClone(defaultHistorySettings),
        practice: structuredClone(defaultPracticeSettings),
      });
    } catch {
      settingsPersisted = false;
    }
    if (!settingsPersisted) {
      issues.push("some default settings could not be saved");
    }
    let preferencesCleared = false;
    try {
      preferencesCleared = this.dependencies.clearAppPreferences();
    } catch {
      preferencesCleared = false;
    }
    if (!preferencesCleared) {
      issues.push("some app preferences could not be cleared");
    }
    try {
      await this.dependencies.refreshStores();
    } catch {
      issues.push("app data could not be fully refreshed");
    }
    const persisted = settingsPersisted && preferencesCleared;
    return {
      cleared: true,
      settingsPersisted: persisted,
      warning:
        issues.length === 0
          ? null
          : `Local data was cleared, but ${issues.join("; ")}.`,
    };
  }
}

export const backupService = new BackupService();
