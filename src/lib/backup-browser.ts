import {
  backupFileName,
  MAX_BACKUP_FILE_BYTES,
  parseBackupText,
  serializeBackupEnvelope,
  BackupFileError,
  type BackupPreview,
} from "@/lib/backup-envelope";
import { downloadTextFile, readTextFile } from "@/lib/browser-file";
import type { BackupEnvelope } from "@/types/persistence";

export async function parseBackupFile(file: File): Promise<BackupPreview> {
  const text = await readTextFile(
    file,
    MAX_BACKUP_FILE_BYTES,
    "Backup file is larger than the 25 MB limit.",
  ).catch((error: unknown) => {
    throw error instanceof BackupFileError
      ? error
      : new BackupFileError(
          error instanceof Error
            ? error.message
            : "Backup file could not be read.",
        );
  });
  return parseBackupText(text, file.name);
}

export function downloadBackupEnvelope(envelope: BackupEnvelope): void {
  downloadTextFile(
    serializeBackupEnvelope(envelope),
    backupFileName(envelope.exportedAt),
    "application/json",
  );
}
