import { validateBackupEnvelope } from "@/lib/persistence-validation";
import type {
  BackupEnvelope,
  BackupSettings,
  ImportCollectionCounts,
  PersistenceSnapshot,
} from "@/types/persistence";

export const MAX_BACKUP_FILE_BYTES = 25 * 1024 * 1024;

export interface BackupPreview {
  byteSize: number;
  counts: ImportCollectionCounts;
  envelope: BackupEnvelope;
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
  exportedAt = new Date(),
): BackupEnvelope {
  return {
    app: "web-band",
    data: {
      ...structuredClone(snapshot),
      settings: structuredClone(settings),
    },
    exportedAt: exportedAt.toISOString(),
    version: 1,
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

  const validation = validateBackupEnvelope(value);
  if (!validation.success) {
    throw new BackupFileError(
      `This is not a valid Web Band backup. ${validation.errors[0] ?? "The backup is incomplete."}`,
    );
  }

  const envelope = structuredClone(value as BackupEnvelope);
  const counts = collectionCounts(envelope.data);
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
