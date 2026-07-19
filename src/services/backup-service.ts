import { clearAllAppPreferenceKeys } from "@/db/repositories/app-preferences-repository";
import {
  clearOnboardingDismissal,
  saveOnboardingDismissal,
  shouldShowOnboarding,
} from "@/db/repositories/onboarding-preferences-repository";
import { builtInPatterns } from "@/data/patterns";
import { defaultHistorySettings } from "@/db/repositories/history-settings-repository";
import { defaultPracticeSettings } from "@/db/repositories/settings-repository";
import { storageService, type StorageService } from "@/db/storage-service";
import { downloadBackupEnvelope } from "@/lib/backup-browser";
import {
  createBackupEnvelope,
  defaultBackupPreferences,
  normalizeBackupEnvelope,
  snapshotFromBackup,
} from "@/lib/backup-envelope";
import { executeStorageOperation } from "@/lib/storage-execution";
import { useChordProgressionStore } from "@/stores/chord-progression-store";
import { useAppearanceStore } from "@/stores/appearance-store";
import {
  createDefaultGuidedPracticeValues,
  useGuidedPracticeStore,
} from "@/stores/guided-practice-store";
import { useHistorySettingsStore } from "@/stores/history-settings-store";
import { usePatternStore } from "@/stores/pattern-store";
import { usePracticeHistoryStore } from "@/stores/practice-history-store";
import { usePracticePresetStore } from "@/stores/practice-preset-store";
import { usePracticeStore } from "@/stores/practice-store";
import { reportPreferenceWrite } from "@/stores/storage-store";
import { useStrummingPatternStore } from "@/stores/strumming-pattern-store";
import type {
  BackupEnvelope,
  BackupPreferences,
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
  applyPreferences: (preferences: BackupPreferences) => boolean;
  applySettings: (settings: BackupSettings) => boolean;
  clearAppPreferences: () => boolean;
  downloadEnvelope: (envelope: BackupEnvelope) => void;
  executeStorageOperation: <T>(operation: () => Promise<T>) => Promise<T>;
  flushPendingHistory: () => Promise<void>;
  getPreferences: (snapshot: PersistenceSnapshot) => BackupPreferences;
  getSettings: () => BackupSettings;
  refreshStores: () => Promise<void>;
  storage: BackupStorage;
}

function backupVersion(value: unknown): 1 | 2 | 3 | 4 | null {
  if (typeof value !== "object" || value === null || Array.isArray(value)) {
    return null;
  }
  const version = (value as Record<string, unknown>).version;
  return version === 1 || version === 2 || version === 3 || version === 4
    ? version
    : null;
}

function getCurrentPreferences(
  snapshot: PersistenceSnapshot,
): BackupPreferences {
  const appearance = useAppearanceStore.getState();
  const availablePatternIds = new Set([
    ...builtInPatterns.map(({ id }) => id),
    ...snapshot.customPatterns.map(({ id }) => id),
  ]);
  return structuredClone({
    appearance: {
      beatFlashIntensity: appearance.beatFlashIntensity,
      reducedMotion: appearance.reducedMotion,
      theme: appearance.theme,
      visualSubdivisionDetail: appearance.visualSubdivisionDetail,
    },
    onboardingDismissed: !shouldShowOnboarding(),
    recentPatternIds: usePatternStore
      .getState()
      .recentPatternIds.filter((id) => availablePatternIds.has(id)),
  });
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

export interface ResetSettingsCompletion {
  reset: true;
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
      bpmAdjustmentStep: practice.bpmAdjustmentStep,
      countInMeasures: practice.countInMeasures,
      fillFrequency: practice.fillFrequency,
      humanization: practice.humanization,
      masterVolume: practice.masterVolume,
      mixer: practice.mixer,
      restoreLastPractice: practice.restoreLastPractice,
      selectedPatternId: practice.selectedPatternId,
      soundCharacter: practice.soundCharacter,
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

function applyCurrentPreferences(preferences: BackupPreferences): boolean {
  const operations = [
    () =>
      useAppearanceStore.getState().replacePreferences(preferences.appearance),
    () =>
      usePatternStore
        .getState()
        .replaceRecentPatternIds(preferences.recentPatternIds),
    () => {
      const persisted = preferences.onboardingDismissed
        ? saveOnboardingDismissal()
        : clearOnboardingDismissal();
      reportPreferenceWrite("onboarding", persisted);
      return persisted;
    },
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

const defaultDependencies: BackupServiceDependencies = {
  applyPreferences: applyCurrentPreferences,
  applySettings: applyCurrentSettings,
  clearAppPreferences: clearAllAppPreferenceKeys,
  downloadEnvelope: downloadBackupEnvelope,
  executeStorageOperation,
  flushPendingHistory: () =>
    usePracticeHistoryStore.getState().flushPendingWrites(),
  getPreferences: getCurrentPreferences,
  getSettings: getCurrentSettings,
  refreshStores: refreshCurrentStores,
  storage: storageService,
};

export class BackupService {
  constructor(private readonly dependencies = defaultDependencies) {}

  async createCurrentBackup(): Promise<BackupEnvelope> {
    await this.dependencies.flushPendingHistory();
    const snapshot = await this.dependencies.executeStorageOperation(() =>
      this.dependencies.storage.exportSnapshot(),
    );
    return normalizeBackupEnvelope(
      createBackupEnvelope(
        snapshot,
        this.dependencies.getSettings(),
        this.dependencies.getPreferences(snapshot),
      ),
    );
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
    const sourceVersion = backupVersion(value);
    const envelope = normalizeBackupEnvelope(value);

    if (mode === "replace") await this.exportCurrentBackup();
    else await this.dependencies.flushPendingHistory();
    const summary = await this.dependencies.executeStorageOperation(() =>
      this.dependencies.storage.importSnapshot(
        snapshotFromBackup(envelope),
        mode,
      ),
    );
    const issues: string[] = [];

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
    const shouldApplyPreferences =
      sourceVersion === 3 || sourceVersion === 4 || mode === "replace";
    let preferencesPersisted = true;
    if (shouldApplyPreferences) {
      try {
        preferencesPersisted = this.dependencies.applyPreferences(
          envelope.data.preferences,
        );
      } catch {
        preferencesPersisted = false;
      }
      if (!preferencesPersisted) {
        issues.push(
          "some app preferences could not be saved for the next visit",
        );
      }
    }
    try {
      await this.dependencies.refreshStores();
    } catch {
      issues.push("app data could not be fully refreshed");
    }

    return {
      ...summary,
      settingsPersisted: settingsPersisted && preferencesPersisted,
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
      issues.push("some live settings could not be reset");
    }
    let preferencesReset = false;
    try {
      preferencesReset = this.dependencies.applyPreferences(
        defaultBackupPreferences,
      );
    } catch {
      preferencesReset = false;
    }
    if (!preferencesReset) {
      issues.push("some live preferences could not be reset");
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
    const persisted =
      settingsPersisted && preferencesReset && preferencesCleared;
    return {
      cleared: true,
      settingsPersisted: persisted,
      warning:
        issues.length === 0
          ? null
          : `Local data was cleared, but ${issues.join("; ")}.`,
    };
  }

  resetSettings(): ResetSettingsCompletion {
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
    if (!settingsPersisted) issues.push("some app settings could not be reset");

    let preferencesPersisted = false;
    try {
      preferencesPersisted = this.dependencies.applyPreferences(
        defaultBackupPreferences,
      );
    } catch {
      preferencesPersisted = false;
    }
    if (!preferencesPersisted) {
      issues.push("some app preferences could not be reset");
    }

    return {
      reset: true,
      settingsPersisted: settingsPersisted && preferencesPersisted,
      warning:
        issues.length === 0
          ? null
          : `Settings were reset, but ${issues.join("; ")}.`,
    };
  }
}

export const backupService = new BackupService();
