import { validateBackupEnvelope } from "@/lib/persistence-validation";
import type {
  BackupEnvelope,
  BackupPreferences,
  BackupSettings,
  ImportCollectionCounts,
  PersistenceSnapshot,
  VersionedBackupEnvelope,
} from "@/types/persistence";

export const MAX_BACKUP_FILE_BYTES = 25 * 1024 * 1024;

export const defaultBackupPreferences: BackupPreferences = {
  appearance: { reducedMotion: false, theme: "dark" },
  onboardingDismissed: false,
  recentPatternIds: [],
};

export interface BackupPreview {
  byteSize: number;
  counts: ImportCollectionCounts;
  envelope: VersionedBackupEnvelope;
  exportedAt: string;
  fileName: string | null;
  totalRecords: number;
}

export class BackupFileError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "BackupFileError";
  }
}

function collectionCounts(
  snapshot: PersistenceSnapshot,
): ImportCollectionCounts {
  return {
    customChordProgressions: snapshot.customChordProgressions.length,
    customPatterns: snapshot.customPatterns.length,
    customStrummingPatterns: snapshot.customStrummingPatterns.length,
    favoriteChordProgressionIds: snapshot.favoriteChordProgressionIds.length,
    favoritePatternIds: snapshot.favoritePatternIds.length,
    practicePresets: snapshot.practicePresets.length,
    practiceSessions: snapshot.practiceSessions.length,
  };
}

export function createBackupEnvelope(
  snapshot: PersistenceSnapshot,
  settings: BackupSettings,
  preferences: BackupPreferences,
  exportedAt = new Date(),
): BackupEnvelope {
  return {
    app: "web-band",
    data: {
      ...structuredClone(snapshot),
      preferences: structuredClone(preferences),
      settings: structuredClone(settings),
    },
    exportedAt: exportedAt.toISOString(),
    version: 3,
  };
}

export function serializeBackupEnvelope(envelope: BackupEnvelope): string {
  return `${JSON.stringify(envelope, null, 2)}\n`;
}

export function backupFileName(exportedAt: string): string {
  return `web-band-backup-${exportedAt.slice(0, 10)}.json`;
}

export function parseBackupText(
  text: string,
  fileName: string | null = null,
): BackupPreview {
  const byteSize = new TextEncoder().encode(text).byteLength;
  if (byteSize > MAX_BACKUP_FILE_BYTES) {
    throw new BackupFileError("Backup file is larger than the 25 MB limit.");
  }

  let value: unknown;
  try {
    value = JSON.parse(text) as unknown;
  } catch {
    throw new BackupFileError("This file is not valid JSON.");
  }

  const normalized = normalizeBackupEnvelope(value);
  const envelope = structuredClone(value as VersionedBackupEnvelope);
  const counts = collectionCounts(normalized.data);
  return {
    byteSize,
    counts,
    envelope,
    exportedAt: envelope.exportedAt,
    fileName,
    totalRecords: Object.values(counts).reduce(
      (total, count) => total + count,
      0,
    ),
  };
}

export function normalizeBackupEnvelope(value: unknown): BackupEnvelope {
  const validation = validateBackupEnvelope(value);
  if (!validation.success) {
    throw new BackupFileError(
      `This is not a valid Web Band backup. ${validation.errors[0] ?? "The backup is incomplete."}`,
    );
  }

  const envelope = structuredClone(value as VersionedBackupEnvelope);
  if (envelope.version === 3) return envelope;

  const settings: BackupSettings =
    envelope.version === 1
      ? {
          ...structuredClone(envelope.data.settings),
          practice: {
            ...structuredClone(envelope.data.settings.practice),
            soundCharacter: "balanced",
          },
        }
      : structuredClone(envelope.data.settings);
  if (settings.history.minimumDurationSeconds === 0) {
    settings.history.minimumDurationSeconds = 1;
  }

  return {
    ...envelope,
    data: {
      ...envelope.data,
      preferences: structuredClone(defaultBackupPreferences),
      settings,
    },
    version: 3,
  };
}

export function snapshotFromBackup(
  envelope: BackupEnvelope,
): PersistenceSnapshot {
  return structuredClone({
    customChordProgressions: envelope.data.customChordProgressions,
    customPatterns: envelope.data.customPatterns,
    customStrummingPatterns: envelope.data.customStrummingPatterns,
    favoriteChordProgressionIds: envelope.data.favoriteChordProgressionIds,
    favoritePatternIds: envelope.data.favoritePatternIds,
    practicePresets: envelope.data.practicePresets,
    practiceSessions: envelope.data.practiceSessions,
  });
}
